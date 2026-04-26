import { describe, it, expect } from "vitest";
import { validateWorkflowGraph } from "../core/validate.js";
import type { WorkflowGraph } from "../core/types.js";

const validGraph: WorkflowGraph = {
  graphId: "test-001",
  title: "Test Graph",
  version: "1.0.0",
  graphType: "workflow",
  nodes: [
    { id: "start", label: "Start", nodeType: "start" },
    { id: "step1", label: "Do Something", nodeType: "step" },
    { id: "end", label: "End", nodeType: "end" },
  ],
  edges: [
    { id: "e1", from: "start", to: "step1", edgeType: "sequence" },
    { id: "e2", from: "step1", to: "end", edgeType: "sequence" },
  ],
};

describe("validateWorkflowGraph", () => {
  it("accepts a valid graph", () => {
    const result = validateWorkflowGraph(validGraph);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.graphId).toBe("test-001");
    }
  });

  it("rejects missing graphId", () => {
    const bad = { ...validGraph, graphId: undefined };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects missing title", () => {
    const bad = { ...validGraph, title: undefined };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects empty nodes array with missing id in edge", () => {
    const bad: WorkflowGraph = {
      ...validGraph,
      edges: [{ id: "e1", from: "nonexistent", to: "end" }],
    };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes("nonexistent"))).toBe(true);
    }
  });

  it("rejects duplicate node IDs", () => {
    const bad: WorkflowGraph = {
      ...validGraph,
      nodes: [
        { id: "start", label: "Start", nodeType: "start" },
        { id: "start", label: "Duplicate", nodeType: "step" },
        { id: "end", label: "End", nodeType: "end" },
      ],
    };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes("Duplicate node id"))).toBe(true);
    }
  });

  it("rejects duplicate edge IDs", () => {
    const bad: WorkflowGraph = {
      ...validGraph,
      edges: [
        { id: "e1", from: "start", to: "step1" },
        { id: "e1", from: "step1", to: "end" },
      ],
    };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid nodeType", () => {
    const bad = {
      ...validGraph,
      nodes: [
        { id: "start", label: "Start", nodeType: "invalid_type" },
      ],
    };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid graphType", () => {
    const bad = { ...validGraph, graphType: "unknown_type" };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects edge referencing missing node", () => {
    const bad: WorkflowGraph = {
      ...validGraph,
      edges: [
        { id: "e1", from: "start", to: "MISSING_ID" },
      ],
    };
    const result = validateWorkflowGraph(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes("MISSING_ID"))).toBe(true);
    }
  });

  it("accepts optional fields", () => {
    const full: WorkflowGraph = {
      ...validGraph,
      description: "A full graph",
      direction: "LR",
      lanes: [{ id: "l1", label: "Team A" }],
      warnings: ["Watch out"],
      unresolvedItems: ["Unknown step"],
      metadata: { source: "test" },
    };
    const result = validateWorkflowGraph(full);
    expect(result.ok).toBe(true);
  });
});
