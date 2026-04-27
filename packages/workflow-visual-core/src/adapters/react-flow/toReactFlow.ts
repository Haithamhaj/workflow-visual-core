import { validateWorkflowGraph } from "../../core/validate.js";
import { ValidationFailedError } from "../../core/errors.js";
import type { WorkflowGraph, WorkflowGraphNode, WorkflowGraphEdge, NodeType } from "../../core/types.js";
import type {
  ReactFlowNodeLike,
  ReactFlowEdgeLike,
  ReactFlowOutput,
  ReactFlowAdapterOptions,
  ReactFlowPosition,
} from "./reactFlowTypes.js";

// ── Node type → React Flow type mapping ──────────────────

function mapNodeType(_nodeType: NodeType): string {
  return "default";
}

// ── Node color palette by type ────────────────────────────

export type NodeColors = { bg: string; border: string; color: string; radius: string };

export function nodeColors(nodeType: NodeType, status?: string): NodeColors {
  const c = (bg: string, border: string, color: string, radius = "6px"): NodeColors => ({ bg, border, color, radius });

  if (status === "warning" || nodeType === "warning")         return c("#3d2e00", "#ffc107", "#ffc107");
  if (status === "unresolved" || nodeType === "unresolved")   return c("#3d0e0e", "#dc3545", "#ff8a8a");
  if (status === "assumed")                                   return c("#0c2a30", "#17a2b8", "#63d9ef");
  if (nodeType === "start")                                   return c("#0d2e1a", "#28a745", "#4cde8a", "24px");
  if (nodeType === "end")                                     return c("#0a1e3d", "#3b82f6", "#7cb8ff", "24px");
  if (nodeType === "decision")                                return c("#2e2500", "#f9a825", "#ffd54f");
  if (nodeType === "handoff")                                 return c("#1a1c3a", "#5c6bc0", "#9fa8da");
  if (nodeType === "approval")                                return c("#1a2a1a", "#28a745", "#6fcf97");
  if (nodeType === "external" || nodeType === "interface")    return c("#1e1e22", "#6c757d", "#adb5bd");
  if (nodeType === "system")                                  return c("#0a1929", "#1976d2", "#64b5f6");
  if (nodeType === "note")                                    return c("#1e1a00", "#f9a825", "#ffd54f");

  return c("#2a2a35", "#4a4a58", "#e8e8f0");
}

// ── Simple layered layout ─────────────────────────────────
// Assigns levels by longest path from source nodes, then positions by level

function computeLayeredLayout(
  nodes: WorkflowGraphNode[],
  edges: WorkflowGraphEdge[],
  spacingX: number,
  spacingY: number
): Map<string, ReactFlowPosition> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjOut = new Map<string, string[]>();
  const adjIn = new Map<string, string[]>();

  for (const n of nodes) {
    adjOut.set(n.id, []);
    adjIn.set(n.id, []);
  }

  for (const e of edges) {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      adjOut.get(e.from)!.push(e.to);
      adjIn.get(e.to)!.push(e.from);
    }
  }

  // BFS-based level assignment
  const levels = new Map<string, number>();
  const queue: string[] = [];

  // Find roots (no incoming edges)
  for (const n of nodes) {
    const inEdges = adjIn.get(n.id) ?? [];
    if (inEdges.length === 0) {
      levels.set(n.id, 0);
      queue.push(n.id);
    }
  }

  // Handle disconnected nodes
  if (queue.length === 0 && nodes.length > 0) {
    const firstId = nodes[0]!.id;
    levels.set(firstId, 0);
    queue.push(firstId);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;
    for (const neighbor of adjOut.get(current) ?? []) {
      const existingLevel = levels.get(neighbor) ?? -1;
      if (existingLevel < currentLevel + 1) {
        levels.set(neighbor, currentLevel + 1);
        queue.push(neighbor);
      }
    }
  }

  // Assign default level 0 to any unvisited nodes
  for (const n of nodes) {
    if (!levels.has(n.id)) {
      levels.set(n.id, 0);
    }
  }

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  for (const [nodeId, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(nodeId);
  }

  // Compute positions
  const positions = new Map<string, ReactFlowPosition>();
  for (const [level, nodeIdsAtLevel] of levelGroups) {
    const totalWidth = (nodeIdsAtLevel.length - 1) * spacingX;
    nodeIdsAtLevel.forEach((nodeId, idx) => {
      positions.set(nodeId, {
        x: idx * spacingX - totalWidth / 2,
        y: level * spacingY,
      });
    });
  }

  return positions;
}

// ── Grid layout fallback ──────────────────────────────────

function computeGridLayout(
  nodes: WorkflowGraphNode[],
  spacingX: number,
  spacingY: number
): Map<string, ReactFlowPosition> {
  const positions = new Map<string, ReactFlowPosition>();
  const cols = Math.ceil(Math.sqrt(nodes.length));
  nodes.forEach((node, idx) => {
    positions.set(node.id, {
      x: (idx % cols) * spacingX,
      y: Math.floor(idx / cols) * spacingY,
    });
  });
  return positions;
}

// ── Edge style ────────────────────────────────────────────

function edgeStyle(edgeType?: string, status?: string): Record<string, string | number> {
  if (status === "warning") return { stroke: "#ffc107", strokeWidth: 2 };
  if (status === "unresolved") return { stroke: "#dc3545", strokeWidth: 2, strokeDasharray: "5,5" };
  if (edgeType === "handoff" || edgeType === "reference") {
    return { stroke: "#5c6bc0", strokeWidth: 2, strokeDasharray: "6,3" };
  }
  if (edgeType === "exception") return { stroke: "#dc3545", strokeWidth: 1.5, strokeDasharray: "4,4" };
  if (edgeType === "feedback") return { stroke: "#17a2b8", strokeWidth: 2 };
  return { stroke: "#adb5bd", strokeWidth: 1.5 };
}

// ── Main export ───────────────────────────────────────────

export function toReactFlow(
  graph: WorkflowGraph,
  options: ReactFlowAdapterOptions = {}
): ReactFlowOutput {
  if (!options.skipValidation) {
    const result = validateWorkflowGraph(graph);
    if (!result.ok) {
      throw new ValidationFailedError(
        `Cannot convert to React Flow: graph validation failed.\n` +
        result.errors.map((e) => `  - [${e.field}] ${e.message}`).join("\n")
      );
    }
  }

  const spacingX = options.nodeSpacingX ?? 220;
  const spacingY = options.nodeSpacingY ?? 120;
  const layoutStrategy = options.layout ?? "layered";

  let positions: Map<string, ReactFlowPosition>;

  if (layoutStrategy === "grid") {
    positions = computeGridLayout(graph.nodes, spacingX, spacingY);
  } else if (layoutStrategy === "none") {
    positions = new Map(graph.nodes.map((n) => [n.id, { x: 0, y: 0 }]));
  } else {
    positions = computeLayeredLayout(graph.nodes, graph.edges, spacingX, spacingY);
  }

  const nodes: ReactFlowNodeLike[] = graph.nodes.map((node) => ({
    id: node.id,
    type: mapNodeType(node.nodeType),
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.nodeType,
      description: node.description,
      lane: node.lane,
      layer: node.layer,
      status: node.status,
      markers: node.markers,
      originalNode: node,
      colors: nodeColors(node.nodeType, node.status),
    },
    style: {},
  }));

  const edges: ReactFlowEdgeLike[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label ?? edge.condition,
    type: edge.edgeType === "feedback" ? "smoothstep" : "default",
    animated: edge.edgeType === "handoff" || edge.edgeType === "feedback",
    style: edgeStyle(edge.edgeType, edge.status),
    data: {
      edgeType: edge.edgeType,
      condition: edge.condition,
      status: edge.status,
      originalEdge: edge,
    },
  }));

  return { nodes, edges };
}
