export type GraphType = "workflow" | "decision_tree" | "architecture" | "roadmap" | "dependency_map" | "generic";
export type GraphDirection = "TD" | "LR" | "RL" | "BT";
export type NodeType = "start" | "end" | "step" | "decision" | "handoff" | "approval" | "control" | "system" | "document" | "interface" | "external" | "warning" | "unresolved" | "note" | "group" | "custom";
export type NodeStatus = "confirmed" | "assumed" | "warning" | "unresolved" | "external_unvalidated" | "out_of_scope";
export type EdgeType = "sequence" | "conditional" | "handoff" | "approval" | "dependency" | "reference" | "exception" | "feedback" | "custom";
export type EdgeStatus = "confirmed" | "assumed" | "warning" | "unresolved";
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
export interface WorkflowLane {
    id: string;
    label: string;
    description?: string;
    color?: string;
}
export interface WorkflowGroup {
    id: string;
    label: string;
    nodeIds: string[];
    description?: string;
}
export interface LegendItem {
    symbol: string;
    meaning: string;
}
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
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}
export type ValidationResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    errors: ValidationError[];
};
//# sourceMappingURL=types.d.ts.map