import type { WorkflowGraphNode, WorkflowGraphEdge } from "../../core/types.js";
export interface ReactFlowPosition {
    x: number;
    y: number;
}
export interface ReactFlowNodeData {
    label: string;
    nodeType: string;
    description: string | undefined;
    lane: string | undefined;
    layer: string | undefined;
    status: string | undefined;
    markers: string[] | undefined;
    originalNode: WorkflowGraphNode;
    [key: string]: unknown;
}
export interface ReactFlowNodeLike {
    id: string;
    type: string;
    position: ReactFlowPosition;
    data: ReactFlowNodeData;
    style?: Record<string, string | number>;
}
export interface ReactFlowEdgeLike {
    id: string;
    source: string;
    target: string;
    label: string | undefined;
    type: string;
    animated?: boolean;
    style?: Record<string, string | number>;
    data: {
        edgeType: string | undefined;
        condition: string | undefined;
        status: string | undefined;
        originalEdge: WorkflowGraphEdge;
        [key: string]: unknown;
    };
}
export interface ReactFlowAdapterOptions {
    /** Skip validation before conversion */
    skipValidation?: boolean;
    /** Layout strategy */
    layout?: "grid" | "layered" | "none";
    /** Horizontal spacing between nodes */
    nodeSpacingX?: number;
    /** Vertical spacing between nodes */
    nodeSpacingY?: number;
}
export interface ReactFlowOutput {
    nodes: ReactFlowNodeLike[];
    edges: ReactFlowEdgeLike[];
}
//# sourceMappingURL=reactFlowTypes.d.ts.map