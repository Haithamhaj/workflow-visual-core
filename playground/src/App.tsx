import { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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
  const id = `mr-${++mermaidCounter}`;
  const scratch = getScratch();
  scratch.innerHTML = "";
  const { svg } = await mermaid.render(id, text, scratch);
  return svg;
}

export default function App() {
  const [jsonInput, setJsonInput] = useState<string>(EXAMPLES[DEFAULT_EXAMPLE]!);
  const [activeTab, setActiveTab] = useState<TabType>("mermaid");
  const [validation, setValidation] = useState<ValidationState>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");
  const [mermaidText, setMermaidText] = useState<string>("");
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [jsonOutput, setJsonOutput] = useState<string>("");
  const [selectedExample, setSelectedExample] = useState<string>(DEFAULT_EXAMPLE);
  const [copied, setCopied] = useState(false);

  const processGraph = useCallback(async (input: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(input); }
    catch {
      setValidation({ ok: false, errors: [{ field: "JSON", message: "Invalid JSON syntax" }] });
      return;
    }

    const result = validateWorkflowGraph(parsed);
    setValidation(result.ok ? { ok: true } : { ok: false, errors: result.errors });
    if (!result.ok) return;

    try {
      const text = toMermaid(result.data, { skipValidation: true, includeTitle: true });
      setMermaidText(text);
      const svg = await renderMermaid(text);
      setMermaidSvg(svg);
    } catch (err) {
      setMermaidSvg(`<pre style="color:#ef4444;padding:16px;font-size:11px;white-space:pre-wrap;">Render error:\n${String(err)}</pre>`);
    }

    try {
      const rf = toReactFlow(result.data, { skipValidation: true });
      setRfNodes(rf.nodes as unknown as Node[]);
      setRfEdges(rf.edges as unknown as Edge[]);
    } catch { setRfNodes([]); setRfEdges([]); }

    try {
      setJsonOutput(JSON.stringify(toReactFlow(result.data, { skipValidation: true }), null, 2));
    } catch { setJsonOutput("{}"); }
  }, [setRfNodes, setRfEdges]);

  useEffect(() => { processGraph(jsonInput); }, [jsonInput, processGraph]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
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
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel */}
        <div style={{ width: "420px", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>WorkflowGraph JSON</span>
            <ValidationBadge state={validation} />
          </div>
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
                  {tab === "mermaid" ? "Mermaid" : tab === "reactflow" ? "React Flow" : "RF JSON"}
                </button>
              ))}
            </div>
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

          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {activeTab === "mermaid" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="mermaid-output" style={{ flex: 1, overflow: "auto", padding: "24px", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "var(--surface2)" }}
                  dangerouslySetInnerHTML={{ __html: mermaidSvg || '<div style="color:#4a4a58;font-size:13px;margin-top:60px;">Paste a valid WorkflowGraph JSON →</div>' }} />
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "var(--surface)", maxHeight: "160px", overflow: "auto", flexShrink: 0 }}>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Raw Mermaid Text</div>
                  <pre style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{mermaidText}</pre>
                </div>
              </div>
            )}

            {activeTab === "reactflow" && (
              <ReactFlow nodes={rfNodes} edges={rfEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                fitView fitViewOptions={{ padding: 0.3 }} style={{ background: "var(--surface2)" }} proOptions={{ hideAttribution: false }}>
                <Background color="#2a2a30" gap={20} size={1} />
                <Controls style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
                <MiniMap style={{ background: "var(--surface)", border: "1px solid var(--border)" }} nodeColor="#6e56cf" maskColor="rgba(0,0,0,0.6)" />
              </ReactFlow>
            )}

            {activeTab === "json-out" && (
              <pre style={{ height: "100%", overflow: "auto", margin: 0, padding: "20px", fontSize: "11px", lineHeight: 1.7, color: "var(--text-muted)", background: "var(--surface2)", fontFamily: "var(--font-mono)" }}>
                {jsonOutput}
              </pre>
            )}
          </div>
        </div>
      </div>
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
