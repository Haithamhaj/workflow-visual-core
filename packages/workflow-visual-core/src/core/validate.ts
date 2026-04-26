import Ajv from "ajv";
import { workflowGraphSchema } from "./schema.js";
import type { WorkflowGraph, ValidationResult, ValidationError } from "./types.js";

const ajv = new Ajv({ allErrors: true });
const schemaValidator = ajv.compile(workflowGraphSchema);

export function validateWorkflowGraph(input: unknown): ValidationResult<WorkflowGraph> {
  const errors: ValidationError[] = [];

  // ── Schema validation ──────────────────────────────────
  const valid = schemaValidator(input);
  if (!valid && schemaValidator.errors) {
    for (const err of schemaValidator.errors) {
      errors.push({
        field: err.instancePath || err.schemaPath,
        message: err.message ?? "Invalid value",
        value: err.data,
      });
    }
    return { ok: false, errors };
  }

  // ── Cast — schema validated, safe to proceed ──────────
  const graph = input as WorkflowGraph;

  // ── Duplicate node IDs ────────────────────────────────
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({ field: `nodes[${node.id}]`, message: `Duplicate node id: "${node.id}"` });
    }
    nodeIds.add(node.id);
  }

  // ── Duplicate edge IDs ────────────────────────────────
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push({ field: `edges[${edge.id}]`, message: `Duplicate edge id: "${edge.id}"` });
    }
    edgeIds.add(edge.id);
  }

  // ── Edge references valid node IDs ────────────────────
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push({
        field: `edges[${edge.id}].from`,
        message: `Edge "${edge.id}" references unknown node: "${edge.from}"`,
        value: edge.from,
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        field: `edges[${edge.id}].to`,
        message: `Edge "${edge.id}" references unknown node: "${edge.to}"`,
        value: edge.to,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: graph };
}
