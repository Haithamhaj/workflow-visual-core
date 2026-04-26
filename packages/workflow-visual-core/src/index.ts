// ============================================================
// workflow-visual-core — Public API
// ============================================================

export { validateWorkflowGraph } from "./core/validate.js";
export { toMermaid } from "./adapters/mermaid/toMermaid.js";
export { toReactFlow } from "./adapters/react-flow/toReactFlow.js";

export type {
  WorkflowGraph,
  WorkflowGraphNode,
  WorkflowGraphEdge,
  WorkflowLane,
  WorkflowGroup,
  LegendItem,
  GraphType,
  GraphDirection,
  NodeType,
  NodeStatus,
  EdgeType,
  EdgeStatus,
  ValidationError,
  ValidationResult,
} from "./core/types.js";

export type {
  MermaidRenderOptions,
} from "./adapters/mermaid/mermaidTypes.js";

export type {
  ReactFlowAdapterOptions,
  ReactFlowNodeLike,
  ReactFlowEdgeLike,
  ReactFlowNodeData,
  ReactFlowOutput,
} from "./adapters/react-flow/reactFlowTypes.js";

export {
  WorkflowVisualError,
  ValidationFailedError,
  AdapterError,
} from "./core/errors.js";
