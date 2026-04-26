import { describe, it, expect } from "vitest";
import { toMermaid } from "../adapters/mermaid/toMermaid.js";
import type { WorkflowGraph } from "../core/types.js";

const linearGraph: WorkflowGraph = {
  graphId: "mermaid-test-001",
  title: "Mermaid Test",
  version: "1.0.0",
  graphType: "workflow",
  direction: "TD",
  nodes: [
    { id: "start", label: "Start", nodeType: "start" },
    { id: "step1", label: "Process Data", nodeType: "step" },
    { id: "decision1", label: "Valid?", nodeType: "decision" },
    { id: "warning1", label: "Needs Review", nodeType: "warning", status: "warning" },
    { id: "end", label: "Done", nodeType: "end" },
  ],
  edges: [
    { id: "e1", from: "start", to: "step1", edgeType: "sequence" },
    { id: "e2", from: "step1", to: "decision1", edgeType: "sequence" },
    { id: "e3", from: "decision1", to: "end", edgeType: "conditional", condition: "Yes" },
    { id: "e4", from: "decision1", to: "warning1", edgeType: "conditional", condition: "No" },
    { id: "e5", from: "warning1", to: "end", edgeType: "sequence" },
  ],
};

const fixedLinearGraph = linearGraph;

describe("toMermaid", () => {
  it("generates valid mermaid starting with flowchart", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("flowchart TD");
  });

  it("includes all node IDs", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("start");
    expect(output).toContain("step1");
    expect(output).toContain("decision1");
    expect(output).toContain("end");
  });

  it("renders decision as diamond shape", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("decision1{");
  });

  it("renders start/end as rounded", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("n_start([");
    expect(output).toContain("n_end([");
  });

  it("includes edge conditions", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("Yes");
    expect(output).toContain("No");
  });

  it("includes warning prefix for warning nodes", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("⚠");
  });

  it("includes class definitions by default", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("classDef warning");
    expect(output).toContain("classDef unresolved");
  });

  it("respects LR direction override", () => {
    const output = toMermaid(fixedLinearGraph, { direction: "LR" });
    expect(output).toContain("flowchart LR");
  });

  it("throws on invalid graph", () => {
    const bad = { graphId: "x", version: "1", graphType: "workflow", nodes: [], edges: [] };
    expect(() => toMermaid(bad as unknown as WorkflowGraph)).toThrow();
  });

  it("title comment is included", () => {
    const output = toMermaid(fixedLinearGraph);
    expect(output).toContain("%% Mermaid Test");
  });

  it("produces stable output on repeated calls", () => {
    const out1 = toMermaid(fixedLinearGraph);
    const out2 = toMermaid(fixedLinearGraph);
    expect(out1).toBe(out2);
  });

  it("handles special chars in labels safely", () => {
    const graphWithSpecialChars: WorkflowGraph = {
      graphId: "special-001",
      title: "Special Chars",
      version: "1.0.0",
      graphType: "generic",
      nodes: [
        { id: "n1", label: 'Check "status" [ok]', nodeType: "step" },
        { id: "n2", label: "Result <done>", nodeType: "end" },
      ],
      edges: [{ id: "e1", from: "n1", to: "n2" }],
    };
    const output = toMermaid(graphWithSpecialChars);
    expect(output).not.toContain('"status"');
    expect(output).toContain("&quot;status&quot;");
  });
});
