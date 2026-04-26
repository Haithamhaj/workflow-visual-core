# WDE Integration Guide

> **workflow-visual-core** is a standalone visual rendering library.
> It does NOT own workflow truth, scoring, package eligibility, or business rules.
> WDE owns all of that. This library only renders what WDE gives it.

---

## Role boundary

| Concern | Owner |
|---------|-------|
| Workflow truth (steps, conditions, actors) | **WDE** |
| Pass 6C approval | **WDE** |
| Package eligibility rules | **WDE** |
| Scoring / risk calculation | **WDE** |
| WorkflowGraph JSON generation | **WDE** (constructs from its own data model) |
| Validation of the JSON structure | **workflow-visual-core** |
| Visual rendering (Mermaid, React Flow) | **workflow-visual-core** |

---

## Install in WDE

```bash
# From within your WDE project directory:
npm install ../path/to/workflow-visual-core/packages/workflow-visual-core
```

After building a new version of the library, re-run this command to pick up changes.

To upgrade in the future (once published to npm):

```bash
npm install workflow-visual-core@latest
```

---

## How WDE uses this library

WDE's Pass 6C process produces an approved workflow definition.
WDE transforms that into a `WorkflowGraph` JSON object, then hands it to this library for visual output.

```
WDE domain model
      │
      ▼  (WDE transforms to WorkflowGraph JSON)
WorkflowGraph JSON
      │
      ├──▶ validateWorkflowGraph()  → confirms structure is valid
      ├──▶ toMermaid()              → client-facing documentation diagrams
      └──▶ toReactFlow()            → admin UI interactive graph
```

---

## Usage example

```typescript
import {
  validateWorkflowGraph,
  toMermaid,
  toReactFlow,
  type WorkflowGraph,
} from "workflow-visual-core";

export function buildPackageVisuals(graph: WorkflowGraph) {
  const validation = validateWorkflowGraph(graph);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  return {
    ok: true,
    workflowGraphJson: validation.data,
    workflowMermaid: toMermaid(validation.data),
    workflowReactFlowModel: toReactFlow(validation.data),
  };
}
```

### In client documentation (Mermaid)

```typescript
import { toMermaid } from "workflow-visual-core";

// Returns a Mermaid flowchart string — paste into GitHub, Notion, Confluence, etc.
const mermaidText = toMermaid(graph, {
  direction: "LR",       // left-to-right layout
  includeTitle: true,    // adds graph title as a comment
});
```

### In admin UI (React Flow)

```typescript
import { toReactFlow } from "workflow-visual-core";
import { ReactFlow } from "@xyflow/react";

const { nodes, edges } = toReactFlow(graph, {
  layout: "layered",   // auto-positions nodes
  nodeSpacingX: 220,
  nodeSpacingY: 120,
});

// Render:
<ReactFlow nodes={nodes} edges={edges} fitView />
```

Node metadata (status, description, markers, originalNode) is available in `node.data` for custom node renderers.

---

## WorkflowGraph JSON shape (WDE constructs this)

```typescript
import type {
  WorkflowGraph,
  WorkflowGraphNode,
  WorkflowGraphEdge,
  NodeType,
  NodeStatus,
  EdgeType,
} from "workflow-visual-core";
```

Key fields WDE should populate:

| Field | Notes |
|-------|-------|
| `graphId` | Unique per package/version |
| `graphType` | `"workflow"` for standard WDE packages |
| `direction` | `"TD"` (top-down) or `"LR"` (left-right) |
| `nodes[].nodeType` | Use `start`, `end`, `step`, `decision`, `handoff`, `approval`, `warning`, `unresolved` |
| `nodes[].status` | Use `confirmed`, `assumed`, `warning`, `unresolved` to reflect Pass 6C confidence |
| `nodes[].lane` | Department or actor name for swim-lane context |
| `edges[].edgeType` | `sequence`, `conditional`, `handoff`, `approval`, `exception` |
| `edges[].condition` | Label shown on conditional/decision branches |

See `src/examples/wde-initial-workflow-package.workflow.json` for a complete example.

---

## Validation errors

`validateWorkflowGraph` returns either:

```typescript
{ ok: true, data: WorkflowGraph }
// or
{ ok: false, errors: ValidationError[] }
// ValidationError: { field: string, message: string, value?: unknown }
```

Common errors to handle:
- Missing required fields (`graphId`, `nodes`, `edges`)
- Duplicate node/edge IDs
- Edge references a node ID that doesn't exist
- Invalid enum value for `nodeType`, `edgeType`, `status`

---

## What this library will never do

- Read from or write to any WDE database
- Evaluate workflow logic, conditions, or eligibility
- Score risk or calculate premiums
- Make decisions about which workflow to show
- Store state between renders

WorkflowGraph JSON is always the source of visual truth. The library is stateless — call it with a graph, get visual output back.
