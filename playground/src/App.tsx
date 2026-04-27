import { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import mermaid from "mermaid";
import { validateWorkflowGraph, toMermaid, toReactFlow } from "workflow-visual-core";
import type { ValidationError } from "workflow-visual-core";
import { EXAMPLES } from "./lib/examples";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  themeVariables: {
    primaryColor: "#6e56cf",
    primaryTextColor: "#e8e8f0",
    primaryBorderColor: "#3d3d46",
    lineColor: "#7a7a8a",
    background: "#141416",
    mainBkg: "#1c1c20",
    nodeBorder: "#3d3d46",
    clusterBkg: "#141416",
    titleColor: "#e8e8f0",
    edgeLabelBackground: "#1c1c20",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: "13px",
  },
});

type TabType = "mermaid" | "reactflow" | "json-out";
type ValidationState = { ok: true } | { ok: false; errors: ValidationError[] } | null;
type InputMode = "paste" | "ai";

type SavedDiagram = {
  id: string;
  title: string;
  json: string;
  savedAt: string;
};

const STORAGE_KEY = "workflow_saved_diagrams";
const MAX_SAVED = 20;

const AI_SYSTEM_PROMPT = `You are a WorkflowGraph JSON generator. Always respond with ONLY valid JSON matching this schema exactly — no markdown, no explanation, just raw JSON:
{
  graphId: string (unique),
  title: string,
  description: string,
  version: "1.0.0",
  graphType: "workflow" | "decision_tree" | "architecture" | "roadmap" | "dependency_map" | "generic",
  direction: "TD" | "LR",
  nodes: Array<{ id, label, nodeType, status?, description?, lane?, markers? }>,
  edges: Array<{ id, from, to, edgeType?, label?, condition?, status? }>
}
nodeType options: start, end, step, decision, handoff, approval, control, system, document, interface, external, warning, unresolved, note, group, custom
edgeType options: sequence, conditional, handoff, approval, dependency, reference, exception, feedback, custom
status options: confirmed, assumed, warning, unresolved, external_unvalidated, out_of_scope
Use meaningful IDs (no spaces). Make the diagram detailed and accurate based on the user's description.`;

const DEFAULT_EXAMPLE = Object.keys(EXAMPLES)[0]!;

let scratchEl: HTMLDivElement | null = null;
function getScratch(): HTMLDivElement {
  if (!scratchEl) {
    scratchEl = document.createElement("div");
    scratchEl.style.cssText = "position:fixed;top:-9999px;left:-9999px;visibility:hidden;";
    document.body.appendChild(scratchEl);
  }
  return scratchEl;
}

let mermaidCounter = 0;
async function renderMermaid(text: string): Promise<string> {
  // Double RAF + setTimeout: gives the browser 2 paint opportunities so
  // any loading-spinner state actually renders before the blocking work begins
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  const id = `mr-${++mermaidCounter}`;
  const scratch = getScratch();
  scratch.innerHTML = "";
  const { svg } = await mermaid.render(id, text, scratch);
  return svg;
}

function loadSaved(): SavedDiagram[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistSaved(items: SavedDiagram[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Auto-render Mermaid only for small diagrams (to avoid freezing)
const AUTO_RENDER_NODE_LIMIT = 8;

export default function App() {
  const [jsonInput, setJsonInput] = useState<string>(EXAMPLES[DEFAULT_EXAMPLE]!);
  const [activeTab, setActiveTab] = useState<TabType>("reactflow");
  const [validation, setValidation] = useState<ValidationState>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");
  const [mermaidText, setMermaidText] = useState<string>("");
  const [mermaidReady, setMermaidReady] = useState(false);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [jsonOutput, setJsonOutput] = useState<string>("");
  const [selectedExample, setSelectedExample] = useState<string>(DEFAULT_EXAMPLE);
  const [copied, setCopied] = useState(false);
  const [graphTitle, setGraphTitle] = useState<string>("workflow");
  const [isRendering, setIsRendering] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);

  // AI mode
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  // Save / load
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(loadSaved);
  const [showSaved, setShowSaved] = useState(false);

  const renderGenRef = useRef(0);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Renders Mermaid SVG — call only when user explicitly requests it or diagram is small
  const triggerMermaidRender = useCallback(async (text: string) => {
    const gen = ++renderGenRef.current;
    setIsRendering(true);
    try {
      const svg = await renderMermaid(text);
      if (gen !== renderGenRef.current) return;
      setMermaidSvg(svg);
      setMermaidReady(true);
    } catch (err) {
      if (gen !== renderGenRef.current) return;
      setMermaidSvg(`<pre style="color:#ef4444;padding:16px;font-size:11px;white-space:pre-wrap;">Render error:\n${String(err)}</pre>`);
      setMermaidReady(true);
    } finally {
      if (gen === renderGenRef.current) setIsRendering(false);
    }
  }, []);

  // Processes JSON → validates + React Flow (fast, no Mermaid)
  const processGraph = useCallback(async (input: string) => {
    const gen = ++renderGenRef.current;

    let parsed: unknown;
    try { parsed = JSON.parse(input); }
    catch {
      setValidation({ ok: false, errors: [{ field: "JSON", message: "Invalid JSON syntax" }] });
      return;
    }

    const result = validateWorkflowGraph(parsed);
    if (gen !== renderGenRef.current) return;
    setValidation(result.ok ? { ok: true } : { ok: false, errors: result.errors });
    if (!result.ok) return;

    setGraphTitle(result.data.title ?? "workflow");
    const count = result.data.nodes?.length ?? 0;
    setNodeCount(count);

    // Prepare Mermaid text but don't render yet
    try {
      const text = toMermaid(result.data, { skipValidation: true, includeTitle: true });
      if (gen !== renderGenRef.current) return;
      setMermaidText(text);
      setMermaidReady(false);
      setMermaidSvg("");
      // Auto-render only for small diagrams
      if (count <= AUTO_RENDER_NODE_LIMIT) {
        triggerMermaidRender(text);
      }
    } catch { /* skip mermaid text on error */ }

    try {
      const rf = toReactFlow(result.data, { skipValidation: true });
      if (gen !== renderGenRef.current) return;
      setRfNodes(rf.nodes as unknown as Node[]);
      setRfEdges(rf.edges as unknown as Edge[]);
    } catch { if (gen === renderGenRef.current) { setRfNodes([]); setRfEdges([]); } }

    try {
      const out = JSON.stringify(toReactFlow(result.data, { skipValidation: true }), null, 2);
      if (gen !== renderGenRef.current) return;
      setJsonOutput(out);
    } catch { if (gen === renderGenRef.current) setJsonOutput("{}"); }
  }, [setRfNodes, setRfEdges, triggerMermaidRender]);

  // Debounce: wait 350ms after last keystroke before processing
  useEffect(() => {
    const t = setTimeout(() => processGraph(jsonInput), 350);
    return () => clearTimeout(t);
  }, [jsonInput, processGraph]);

  // Re-fit view whenever nodes change (fitView on <ReactFlow> only fires on mount)
  useEffect(() => {
    if (rfNodes.length > 0) {
      setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.3 }), 50);
    }
  }, [rfNodes]);

  const handleExampleChange = (name: string) => {
    setSelectedExample(name);
    setJsonInput(EXAMPLES[name] ?? "");
  };

  const handleCopy = () => {
    const content = activeTab === "mermaid" ? mermaidText : jsonOutput;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── AI Generator ─────────────────────────────────────────

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
      setAiError("Missing VITE_OPENAI_API_KEY in .env");
      return;
    }
    setIsGenerating(true);
    setAiError("");
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: AI_SYSTEM_PROMPT },
            { role: "user", content: aiPrompt },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { choices: { message: { content: string } }[] };
      let raw = data.choices[0]?.message?.content?.trim() ?? "";
      // Strip markdown code fences if present
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      setInputMode("paste");
      setJsonInput(raw);
    } catch (err) {
      setAiError(String(err instanceof Error ? err.message : err));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save / Load ──────────────────────────────────────────

  const handleSave = () => {
    const title = graphTitle || "Untitled";
    const newItem: SavedDiagram = {
      id: `${Date.now()}`,
      title,
      json: jsonInput,
      savedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...savedDiagrams].slice(0, MAX_SAVED);
    setSavedDiagrams(updated);
    persistSaved(updated);
  };

  const handleLoadSaved = (item: SavedDiagram) => {
    setJsonInput(item.json);
    setShowSaved(false);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedDiagrams.filter((d) => d.id !== id);
    setSavedDiagrams(updated);
    persistSaved(updated);
  };

  // ── Export PNG ───────────────────────────────────────────

  const handleExportPng = () => {
    const svgEl = document.querySelector<SVGSVGElement>(".mermaid-output svg");
    if (!svgEl) return;

    const bbox = svgEl.getBoundingClientRect();
    const width = Math.max(bbox.width, 800);
    const height = Math.max(bbox.height, 400);

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#1c1c20";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const date = new Date().toISOString().slice(0, 10);
      const safe = graphTitle.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      const a = document.createElement("a");
      a.download = `${safe}-${date}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "52px", borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontSize: "15px", fontWeight: 600, letterSpacing: "-0.3px",
            background: "linear-gradient(135deg, #6e56cf, #a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>◈ WorkflowVisual</span>
          <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>playground</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Example:</span>
          <select value={selectedExample} onChange={(e) => handleExampleChange(e.target.value)}
            style={{
              background: "var(--surface2)", border: "1px solid var(--border)",
              color: "var(--text)", padding: "4px 28px 4px 10px", borderRadius: "var(--radius-sm)",
              fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-sans)", appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7a8a'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
            }}>
            {Object.keys(EXAMPLES).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>

          {/* Save button */}
          <button onClick={handleSave} style={{
            padding: "5px 12px", borderRadius: "var(--radius-sm)",
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontSize: "12px", fontWeight: 500,
          }}>💾 Save</button>

          {/* Saved dropdown */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSaved((v) => !v)} style={{
              padding: "5px 12px", borderRadius: "var(--radius-sm)",
              background: showSaved ? "var(--accent-dim)" : "var(--surface2)",
              border: `1px solid ${showSaved ? "#3d2a6e" : "var(--border)"}`,
              color: showSaved ? "#a78bfa" : "var(--text-muted)", fontSize: "12px", fontWeight: 500,
            }}>
              📂 Saved {savedDiagrams.length > 0 && `(${savedDiagrams.length})`}
            </button>

            {showSaved && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", minWidth: "280px", maxHeight: "340px",
                overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}>
                {savedDiagrams.length === 0 ? (
                  <div style={{ padding: "16px", color: "var(--text-dim)", fontSize: "12px", textAlign: "center" }}>
                    No saved diagrams yet
                  </div>
                ) : (
                  savedDiagrams.map((item) => (
                    <div key={item.id} onClick={() => handleLoadSaved(item)}
                      style={{
                        padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)", marginBottom: "2px" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{formatDate(item.savedAt)}</div>
                      </div>
                      <button onClick={(e) => handleDeleteSaved(item.id, e)} style={{
                        background: "transparent", border: "none", color: "var(--text-dim)",
                        fontSize: "14px", padding: "2px 6px", borderRadius: "4px", cursor: "pointer",
                        lineHeight: 1,
                      }} title="Delete">×</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel */}
        <div style={{ width: "420px", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={() => setInputMode("paste")} style={{
                padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 500,
                background: inputMode === "paste" ? "var(--accent-dim)" : "transparent",
                color: inputMode === "paste" ? "#a78bfa" : "var(--text-muted)",
                border: inputMode === "paste" ? "1px solid #3d2a6e" : "1px solid transparent",
              }}>✏️ Paste JSON</button>
              <button onClick={() => setInputMode("ai")} style={{
                padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 500,
                background: inputMode === "ai" ? "var(--accent-dim)" : "transparent",
                color: inputMode === "ai" ? "#a78bfa" : "var(--text-muted)",
                border: inputMode === "ai" ? "1px solid #3d2a6e" : "1px solid transparent",
              }}>✨ Generate with AI</button>
            </div>
            <ValidationBadge state={validation} />
          </div>

          {/* AI mode input */}
          {inputMode === "ai" && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                placeholder="Describe your workflow in Arabic or English…&#10;e.g. 'رسم مخطط لعملية الموافقة على القروض'"
                style={{
                  width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                  color: "var(--text)", fontSize: "12px", lineHeight: 1.6, padding: "10px 12px",
                  borderRadius: "var(--radius-sm)", resize: "none", height: "80px", outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <button onClick={handleGenerate} disabled={isGenerating || !aiPrompt.trim()} style={{
                  padding: "6px 16px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
                  background: isGenerating ? "var(--surface2)" : "var(--accent)",
                  color: isGenerating ? "var(--text-dim)" : "#fff",
                  border: "none", cursor: isGenerating ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}>
                  {isGenerating ? "⏳ Generating…" : "✨ Generate"}
                </button>
                <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>⌘↵ to generate</span>
              </div>
              {aiError && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--error)", lineHeight: 1.4 }}>
                  {aiError}
                </div>
              )}
            </div>
          )}

          <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} spellCheck={false}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12px", lineHeight: 1.7, padding: "16px", overflowY: "auto" }} />

          {validation && !validation.ok && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "#1a0f0f", maxHeight: "180px", overflowY: "auto" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--error)", marginBottom: "8px", letterSpacing: "0.06em" }}>VALIDATION ERRORS</div>
              {validation.errors.map((err, i) => (
                <div key={i} style={{ fontSize: "11px", color: "#fca5a5", marginBottom: "4px", lineHeight: 1.4 }}>
                  <span style={{ color: "var(--text-dim)" }}>[{err.field}]</span> {err.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 16px", height: "44px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["mermaid", "reactflow", "json-out"] as TabType[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "6px 14px", borderRadius: "var(--radius-sm)",
                  background: activeTab === tab ? "var(--accent-dim)" : "transparent",
                  color: activeTab === tab ? "#a78bfa" : "var(--text-muted)",
                  fontSize: "12px", fontWeight: activeTab === tab ? 600 : 400,
                  border: activeTab === tab ? "1px solid #3d2a6e" : "1px solid transparent",
                  transition: "all 0.15s", cursor: "pointer",
                }}>
                  {tab === "mermaid" ? "Mermaid" : tab === "reactflow" ? "⚡ React Flow" : "RF JSON"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {activeTab === "mermaid" && (
                <button onClick={handleExportPng} style={{
                  padding: "5px 12px", borderRadius: "var(--radius-sm)",
                  background: "var(--surface2)", color: "var(--text-muted)",
                  border: "1px solid var(--border)", fontSize: "11px", fontWeight: 500,
                }}>⬇ Export PNG</button>
              )}
              {(activeTab === "mermaid" || activeTab === "json-out") && (
                <button onClick={handleCopy} style={{
                  padding: "5px 12px", borderRadius: "var(--radius-sm)",
                  background: copied ? "#0d2e1a" : "var(--surface2)",
                  color: copied ? "var(--success)" : "var(--text-muted)",
                  border: `1px solid ${copied ? "#166534" : "var(--border)"}`,
                  fontSize: "11px", fontWeight: 500, transition: "all 0.15s", cursor: "pointer",
                }}>{copied ? "✓ Copied" : "Copy"}</button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {activeTab === "mermaid" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="mermaid-output" style={{ flex: 1, overflow: "auto", padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", position: "relative" }}>
                  {isRendering && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,20,22,0.85)", zIndex: 10, flexDirection: "column", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Rendering diagram…</span>
                    </div>
                  )}
                  {!isRendering && !mermaidReady && mermaidText && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "32px" }}>📊</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>
                        This diagram has <strong style={{ color: "var(--text)" }}>{nodeCount} nodes</strong>.<br />
                        Mermaid rendering may take a few seconds.
                      </div>
                      <button
                        onClick={() => triggerMermaidRender(mermaidText)}
                        style={{
                          padding: "10px 24px", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: 600,
                          background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
                      >
                        ▶ Render Mermaid Diagram
                      </button>
                      <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                        Tip: React Flow tab is always instant ⚡
                      </span>
                    </div>
                  )}
                  {!isRendering && mermaidReady && (
                    <div style={{ alignSelf: "flex-start" }} dangerouslySetInnerHTML={{ __html: mermaidSvg }} />
                  )}
                  {!isRendering && !mermaidReady && !mermaidText && (
                    <div style={{ color: "#4a4a58", fontSize: "13px" }}>Paste a valid WorkflowGraph JSON →</div>
                  )}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "var(--surface)", maxHeight: "160px", overflow: "auto", flexShrink: 0 }}>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Raw Mermaid Text</div>
                  <pre style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{mermaidText}</pre>
                </div>
              </div>
            )}

            {activeTab === "reactflow" && (
              <div style={{ position: "absolute", inset: 0, background: "#1c1c20" }}>
                <ReactFlow nodes={rfNodes} edges={rfEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                  onInit={(instance) => { rfInstanceRef.current = instance; }}
                  fitView fitViewOptions={{ padding: 0.3 }}
                  colorMode="dark"
                  style={{ "--xy-background-color": "#1c1c20", "--xy-minimap-background-color": "#141416" } as React.CSSProperties}
                  proOptions={{ hideAttribution: false }}>
                  <Background color="#2a2a30" gap={20} size={1} />
                  <Controls />
                  <MiniMap nodeColor="#6e56cf" maskColor="rgba(0,0,0,0.6)" />
                </ReactFlow>
              </div>
            )}

            {activeTab === "json-out" && (
              <pre style={{ height: "100%", overflow: "auto", margin: 0, padding: "20px", fontSize: "11px", lineHeight: 1.7, color: "var(--text-muted)", background: "var(--surface2)", fontFamily: "var(--font-mono)" }}>
                {jsonOutput}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Close saved dropdown on outside click */}
      {showSaved && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowSaved(false)} />
      )}
    </div>
  );
}

function ValidationBadge({ state }: { state: ValidationState }) {
  if (!state) return null;
  if (state.ok) return (
    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: "#0d2e1a", color: "var(--success)", border: "1px solid #166534", letterSpacing: "0.06em" }}>✓ VALID</span>
  );
  return (
    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: "#1a0f0f", color: "var(--error)", border: "1px solid #7f1d1d", letterSpacing: "0.06em" }}>
      ✗ {state.errors.length} ERROR{state.errors.length !== 1 ? "S" : ""}
    </span>
  );
}
