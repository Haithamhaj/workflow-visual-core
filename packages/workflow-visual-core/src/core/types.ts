// ============================================================
// workflow-visual-core — Core Types
// Source of visual truth: WorkflowGraph
// ============================================================

export type GraphType =
  | "workflow"
  | "decision_tree"
  | "architecture"
  | "roadmap"
  | "dependency_map"
  | "generic";

export type GraphDirection = "TD" | "LR" | "RL" | "BT";

export type NodeType =
  | "start"
  | "end"
  | "step"
  | "decision"
  | "handoff"
  | "approval"
  | "control"
  | "system"
  | "document"
  | "interface"
  | "external"
  | "warning"
  | "unresolved"
  | "note"
  | "group"
  | "custom";

export type NodeStatus =
  | "confirmed"
  | "assumed"
  | "warning"
  | "unresolved"
  | "external_unvalidated"
  | "out_of_scope";

export type EdgeType =
  | "sequence"
  | "conditional"
  | "handoff"
  | "approval"
  | "dependency"
  | "reference"
  | "exception"
  | "feedback"
  | "custom";

export type EdgeStatus = "confirmed" | "assumed" | "warning" | "unresolved";

// ── Node ──────────────────────────────────────────────────

export interface WorkflowGraphNode {
  id: string;
  label: string;
  nodeType: NodeType;
  description?: string;
  lane?: string;
  layer?: string;
  status?: NodeStatus;
  markers?: string[];
  metadata?: Record<string, unknown>;
}

// ── Edge ──────────────────────────────────────────────────

export interface WorkflowGraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  edgeType?: EdgeType;
  condition?: string;
  status?: EdgeStatus;
  metadata?: Record<string, unknown>;
}

// ── Lane (swimlane) ──────────────────────────────────────

export interface WorkflowLane {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

// ── Group ─────────────────────────────────────────────────

export interface WorkflowGroup {
  id: string;
  label: string;
  nodeIds: string[];
  description?: string;
}

// ── Legend Item ───────────────────────────────────────────

export interface LegendItem {
  symbol: string;
  meaning: string;
}

// ── Top-Level Graph ───────────────────────────────────────

export interface WorkflowGraph {
  graphId: string;
  title: string;
  description?: string;
  version: string;
  graphType: GraphType;
  direction?: GraphDirection;
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  lanes?: WorkflowLane[];
  groups?: WorkflowGroup[];
  legend?: LegendItem[];
  styleHints?: Record<string, string>;
  sourceRefs?: string[];
  warnings?: string[];
  unresolvedItems?: string[];
  metadata?: Record<string, unknown>;
}

// ── Validation Types ──────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ValidationError[] };
