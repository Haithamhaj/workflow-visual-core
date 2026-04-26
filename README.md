# workflow-visual-core

**WorkflowGraph JSON → Mermaid, React Flow, and beyond.**

A portable, standalone TypeScript library for visualizing any graph, workflow, architecture, decision tree, or roadmap. The source of visual truth is a canonical JSON object. Renderers are adapters, not owners of data.

---

## What this IS

- A **library** that converts a `WorkflowGraph` JSON into visual formats
- A **playground** web app where you paste JSON and instantly see the diagram
- Portable: works locally, on Vercel, inside any project
- Zero dependencies on AI, databases, auth, or any specific app

## What this is NOT

- Not a workflow analysis system
- Not an AI reasoning engine
- Not a database-backed app
- Not a drag-and-drop editor (React Flow is the consumer, not built here)
- Not tied to any specific project or platform

---

## Quick Start — Playground

```bash
git clone <repo>
cd workflow-visual-core
npm install
npm run dev          # Opens playground at localhost:5173
```

**Usage:** Paste or edit a `WorkflowGraph` JSON in the left panel. The right panel renders it live as Mermaid diagram, React Flow graph, or raw JSON output.

---

## Deploy to Vercel

```bash
# Push to GitHub, then in Vercel:
# Build Command:   npm run build --workspace=packages/workflow-visual-core && npm run build --workspace=playground
# Output Dir:      playground/dist
# Install Command: npm install
```

Or use the included `vercel.json` — it configures everything automatically.

---

## Using as a Library

```bash
# In your project, link locally:
npm install ../path/to/workflow-visual-core/packages/workflow-visual-core

# Or after publishing to npm:
npm install workflow-visual-core
```

```typescript
import {
  validateWorkflowGraph,
  toMermaid,
  toReactFlow
} from "workflow-visual-core";

const result = validateWorkflowGraph(myGraphJson);

if (!result.ok) {
  console.error(result.errors);
} else {
  const mermaidText = toMermaid(result.data);
  const { nodes, edges } = toReactFlow(result.data);
}
```

---

## WorkflowGraph JSON Model

```json
{
  "graphId": "my-graph-001",
  "title": "My Workflow",
  "description": "Optional description",
  "version": "1.0.0",
  "graphType": "workflow",
  "direction": "TD",
  "nodes": [
    {
      "id": "start",
      "label": "Start",
      "nodeType": "start"
    },
    {
      "id": "step1",
      "label": "Process Data",
      "nodeType": "step",
      "status": "confirmed",
      "description": "Optional description",
      "lane": "Engineering",
      "markers": ["needs review"]
    },
    {
      "id": "decision1",
      "label": "Valid?",
      "nodeType": "decision"
    },
    {
      "id": "end",
      "label": "Done",
      "nodeType": "end"
    }
  ],
  "edges": [
    { "id": "e1", "from": "start", "to": "step1", "edgeType": "sequence" },
    { "id": "e2", "from": "step1", "to": "decision1", "edgeType": "sequence" },
    { "id": "e3", "from": "decision1", "to": "end", "edgeType": "conditional", "condition": "Yes" }
  ]
}
```

### Node Types

| nodeType | Visual | Use for |
|---|---|---|
| `start` | Rounded | Entry point |
| `end` | Rounded | Exit point |
| `step` | Rectangle | Regular action |
| `decision` | Diamond | Branch/choice |
| `handoff` | Arrow shape | Cross-team transfer |
| `approval` | Rectangle | Gate requiring approval |
| `system` | Cylinder | System / database |
| `external` | Double border | External actor |
| `interface` | Double border | API / interface |
| `document` | Slanted | Document / artifact |
| `warning` | ⚠ Yellow | Risk / issue |
| `unresolved` | ? Red | Unknown / TBD |
| `note` | Light yellow | Annotation |

### Node Status

| status | Meaning |
|---|---|
| `confirmed` | Validated |
| `assumed` | Blue dashed — inferred, not confirmed |
| `warning` | Yellow — needs attention |
| `unresolved` | Red — unknown, must resolve |
| `external_unvalidated` | Grey — from external source, unverified |
| `out_of_scope` | Light — noted but excluded |

### Edge Types

`sequence` `conditional` `handoff` `approval` `dependency` `reference` `exception` `feedback` `custom`

### Graph Types

`workflow` `decision_tree` `architecture` `roadmap` `dependency_map` `generic`

---

## Validation

```typescript
const result = validateWorkflowGraph(input);

if (result.ok) {
  // result.data is a fully typed WorkflowGraph
} else {
  // result.errors is ValidationError[]
  // Each: { field, message, value? }
}
```

Catches: missing fields, duplicate IDs, invalid enums, edge refs to non-existent nodes.

---

## Mermaid Adapter

```typescript
const mermaidText = toMermaid(graph, {
  direction: "LR",        // Override direction
  includeTitle: true,     // Add title comment (default: true)
  includeClassDefs: true, // Style classes (default: true)
  skipValidation: false,  // Skip re-validation (default: false)
});
```

Output is copy-pasteable into:
- [mermaid.live](https://mermaid.live)
- GitHub Markdown (` ```mermaid `)
- Notion, Confluence, Obsidian
- Any Mermaid-compatible renderer

---

## React Flow Adapter

```typescript
const { nodes, edges } = toReactFlow(graph, {
  layout: "layered",   // "layered" | "grid" | "none"
  nodeSpacingX: 220,
  nodeSpacingY: 120,
  skipValidation: false,
});

// Use in React Flow:
<ReactFlow nodes={nodes} edges={edges} />
```

All node metadata (status, markers, description, originalNode) is preserved in `node.data`. Your admin UI can access it later.

---

## Using with AI

When discussing any project with an AI assistant, ask:

> "Generate a WorkflowGraph JSON for this architecture/workflow/decision tree"

Paste the returned JSON into the playground. The AI-generated graph must match the WorkflowGraph schema for validation to pass.

Example prompt:
```
Generate a WorkflowGraph JSON (workflow-visual-core format) for a 
customer onboarding process with: initial signup, email verification, 
profile setup, approval gate, and active/rejected states.

Include nodeType, edgeType, and status where appropriate.
Use graphId, title, version, graphType fields.
```

---

## Repository Structure

```
workflow-visual-core/
  vercel.json                        # Vercel deployment config

  packages/
    workflow-visual-core/            # The library
      src/
        core/
          types.ts                   # WorkflowGraph TypeScript types
          schema.ts                  # JSON Schema (Ajv)
          validate.ts                # validateWorkflowGraph()
          errors.ts                  # Custom error classes
        adapters/
          mermaid/
            toMermaid.ts             # Mermaid renderer
            mermaidTypes.ts
            escapeMermaid.ts
          react-flow/
            toReactFlow.ts           # React Flow converter
            reactFlowTypes.ts
        examples/
          simple-linear.workflow.json
          decision-workflow.workflow.json
          cross-department-handoff.workflow.json
          unresolved-warning.workflow.json
          project-architecture.workflow.json
        test/
          validate.test.ts
          mermaid.test.ts
          reactFlow.test.ts
        index.ts                     # Public API

  playground/                        # The web app
    src/
      App.tsx                        # Main playground UI
      lib/examples.ts                # Preset example graphs
```

---

## Scripts

```bash
# Library
npm run test           # Run 34 tests
npm run typecheck      # TypeScript check (strict)
npm run build          # Build library to dist/

# Playground
npm run dev            # Start local dev server
npm run build:all      # Build library + playground
```

---

## Extension Points (Future Adapters)

The library is designed for new adapters:

```typescript
// Future: SVG adapter
export function toSvg(graph: WorkflowGraph, options?: SvgOptions): string

// Future: BPMN adapter
export function toBpmn(graph: WorkflowGraph): string

// Future: JSON export/import
export function exportGraph(graph: WorkflowGraph): string
export function importGraph(json: string): ValidationResult<WorkflowGraph>
```

Each adapter:
1. Accepts `WorkflowGraph` as input
2. Validates first (or accepts `skipValidation`)
3. Returns the target format
4. Does not mutate the graph

---

## Principle

> **WorkflowGraph JSON is the source of visual truth. Mermaid and React Flow are renderers, not data owners.**
