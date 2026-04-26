import { describe, it, expect } from "vitest";
import { toReactFlow } from "../adapters/react-flow/toReactFlow.js";
import type { WorkflowGraph } from "../core/types.js";

const testGraph: WorkflowGraph = {
  graphId: "rf-test-001",
  title: "React Flow Test",
  version: "1.0.0",
  graphType: "workflow",
  nodes: [
    { id: "start", label: "Start", nodeType: "start" },
    { id: "step1", label: "Step 1", nodeType: "step", status: "confirmed" },
    { id: "step2", label: "Step 2", nodeType: "step", status: "warning", markers: ["check this"] },
    { id: "decision", label: "Branch?", nodeType: "decision" },
    { id: "end_a", label: "Path A", nodeType: "end" },
    { id: "end_b", label: "Path B", nodeType: "end" },
  ],
  edges: [
    { id: "e1", from: "start", to: "step1" },
    { id: "e2", from: "step1", to: "step2" },
    { id: "e3", from: "step2", to: "decision" },
    { id: "e4", from: "decision", to: "end_a", edgeType: "conditional", condition: "Yes" },
    { id: "e5", from: "decision", to: "end_b", edgeType: "conditional", condition: "No" },
  ],
};

describe("toReactFlow", () => {
  it("returns nodes and edges", () => {
    const output = toReactFlow(testGraph);
    expect(output).toHaveProperty("nodes");
    expect(output).toHaveProperty("edges");
  });

  it("produces correct number of nodes", () => {
    const output = toReactFlow(testGraph);
    expect(output.nodes).toHaveLength(6);
  });

  it("produces correct number of edges", () => {
    const output = toReactFlow(testGraph);
    expect(output.edges).toHaveLength(5);
  });

  it("preserves node metadata in data field", () => {
    const output = toReactFlow(testGraph);
    const warningNode = output.nodes.find((n) => n.id === "step2");
    expect(warningNode).toBeDefined();
    expect(warningNode?.data.status).toBe("warning");
    expect(warningNode?.data.markers).toContain("check this");
  });

  it("preserves original node reference", () => {
    const output = toReactFlow(testGraph);
    const node = output.nodes.find((n) => n.id === "step1");
    expect(node?.data.originalNode.id).toBe("step1");
    expect(node?.data.originalNode.label).toBe("Step 1");
  });

  it("all nodes have a position", () => {
    const output = toReactFlow(testGraph);
    for (const node of output.nodes) {
      expect(node.position).toHaveProperty("x");
      expect(node.position).toHaveProperty("y");
      expect(typeof node.position.x).toBe("number");
      expect(typeof node.position.y).toBe("number");
    }
  });

  it("maps edge source/target correctly", () => {
    const output = toReactFlow(testGraph);
    const edge = output.edges.find((e) => e.id === "e4");
    expect(edge?.source).toBe("decision");
    expect(edge?.target).toBe("end_a");
    expect(edge?.label).toBe("Yes");
  });

  it("preserves original edge reference", () => {
    const output = toReactFlow(testGraph);
    const edge = output.edges.find((e) => e.id === "e5");
    expect(edge?.data.originalEdge.condition).toBe("No");
  });

  it("applies warning style to warning status nodes", () => {
    const output = toReactFlow(testGraph);
    const warningNode = output.nodes.find((n) => n.id === "step2");
    expect(warningNode?.style?.background).toContain("#fff3cd");
  });

  it("throws on invalid graph", () => {
    const bad = { graphId: "x", version: "1", graphType: "workflow", nodes: [], edges: [] };
    expect(() => toReactFlow(bad as unknown as WorkflowGraph)).toThrow();
  });

  it("grid layout places nodes at different positions", () => {
    const output = toReactFlow(testGraph, { layout: "grid" });
    const positions = output.nodes.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(output.nodes.length);
  });

  it("layered layout assigns different y levels to nodes at different depths", () => {
    const output = toReactFlow(testGraph, { layout: "layered" });
    const startNode = output.nodes.find((n) => n.id === "start");
    const endNode = output.nodes.find((n) => n.id === "end_a");
    expect(startNode?.position.y).toBeLessThan(endNode?.position.y ?? Infinity);
  });
});
