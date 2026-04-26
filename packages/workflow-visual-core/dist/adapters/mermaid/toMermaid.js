import { validateWorkflowGraph } from "../../core/validate.js";
import { ValidationFailedError } from "../../core/errors.js";
import { escapeMermaidLabel, sanitizeNodeId } from "./escapeMermaid.js";
// ── Node shape rendering ───────────────────────────────────
function renderNodeShape(id, label, nodeType) {
    const safeId = sanitizeNodeId(id);
    const safeLabel = escapeMermaidLabel(label);
    switch (nodeType) {
        case "start":
            return `${safeId}([${safeLabel}])`;
        case "end":
            return `${safeId}([${safeLabel}])`;
        case "decision":
            return `${safeId}{${safeLabel}}`;
        case "document":
            return `${safeId}[/${safeLabel}/]`;
        case "note":
            return `${safeId}[${safeLabel}]:::note`;
        case "warning":
            return `${safeId}[⚠ ${safeLabel}]:::warning`;
        case "unresolved":
            return `${safeId}[? ${safeLabel}]:::unresolved`;
        case "external":
        case "interface":
            return `${safeId}[[${safeLabel}]]`;
        case "handoff":
            return `${safeId}>${safeLabel}]`;
        case "system":
            return `${safeId}[(${safeLabel})]`;
        case "group":
            return `${safeId}[${safeLabel}]:::group`;
        default:
            // step, approval, control, custom
            return `${safeId}[${safeLabel}]`;
    }
}
// ── Status CSS class ───────────────────────────────────────
function statusClass(node) {
    if (!node.status)
        return null;
    switch (node.status) {
        case "warning": return "warning";
        case "unresolved": return "unresolved";
        case "assumed": return "assumed";
        case "external_unvalidated": return "external";
        case "out_of_scope": return "outOfScope";
        default: return null;
    }
}
// ── Class definitions block ────────────────────────────────
const CLASS_DEFS = `
  classDef warning fill:#fff3cd,stroke:#ffc107,color:#856404
  classDef unresolved fill:#f8d7da,stroke:#dc3545,color:#721c24
  classDef assumed fill:#d1ecf1,stroke:#17a2b8,color:#0c5460
  classDef external fill:#e2e3e5,stroke:#6c757d,color:#383d41
  classDef outOfScope fill:#f5f5f5,stroke:#aaa,color:#666
  classDef note fill:#fffde7,stroke:#f9a825,color:#5d4037
  classDef group fill:#e8eaf6,stroke:#5c6bc0,color:#283593
`.trim();
// ── Main export ───────────────────────────────────────────
export function toMermaid(graph, options = {}) {
    // Validate unless skipped
    if (!options.skipValidation) {
        const result = validateWorkflowGraph(graph);
        if (!result.ok) {
            throw new ValidationFailedError(`Cannot render Mermaid: graph validation failed.\n` +
                result.errors.map((e) => `  - [${e.field}] ${e.message}`).join("\n"));
        }
    }
    const direction = options.direction ?? graph.direction ?? "TD";
    const lines = [];
    // Title comment
    if (options.includeTitle !== false) {
        lines.push(`%% ${graph.title}`);
        if (graph.description) {
            lines.push(`%% ${graph.description}`);
        }
        lines.push("");
    }
    lines.push(`flowchart ${direction}`);
    // Nodes
    lines.push("");
    lines.push("  %% Nodes");
    const nodeIdMap = new Map(); // original id → sanitized id
    for (const node of graph.nodes) {
        const safeId = sanitizeNodeId(node.id);
        nodeIdMap.set(node.id, safeId);
        const shape = renderNodeShape(node.id, node.label, node.nodeType);
        lines.push(`  ${shape}`);
    }
    // Class assignments from status
    const classAssignments = [];
    for (const node of graph.nodes) {
        const cls = statusClass(node);
        if (cls) {
            classAssignments.push(`  class ${sanitizeNodeId(node.id)} ${cls}`);
        }
    }
    // Edges
    lines.push("");
    lines.push("  %% Edges");
    for (const edge of graph.edges) {
        const fromId = nodeIdMap.get(edge.from) ?? sanitizeNodeId(edge.from);
        const toId = nodeIdMap.get(edge.to) ?? sanitizeNodeId(edge.to);
        const labelText = edge.label ?? edge.condition;
        let arrow;
        switch (edge.edgeType) {
            case "conditional":
                arrow = labelText ? `-->|${escapeMermaidLabel(labelText)}|` : "-- ? -->";
                break;
            case "handoff":
                arrow = labelText ? `-.->|${escapeMermaidLabel(labelText)}|` : "-.->";
                break;
            case "reference":
                arrow = labelText ? `-.->|${escapeMermaidLabel(labelText)}|` : "-.->";
                break;
            case "feedback":
                arrow = labelText ? `-->|${escapeMermaidLabel(labelText)}|` : "==>";
                break;
            case "exception":
                arrow = labelText ? `-.->|⚠ ${escapeMermaidLabel(labelText)}|` : "-.->";
                break;
            case "approval":
                arrow = labelText ? `-->|✓ ${escapeMermaidLabel(labelText)}|` : "-->";
                break;
            default:
                arrow = labelText ? `-->|${escapeMermaidLabel(labelText)}|` : "-->";
        }
        lines.push(`  ${fromId} ${arrow} ${toId}`);
    }
    // Class definitions
    if (options.includeClassDefs !== false) {
        lines.push("");
        lines.push("  %% Styles");
        lines.push(CLASS_DEFS.split("\n").map((l) => `  ${l.trim()}`).join("\n"));
    }
    if (classAssignments.length > 0) {
        lines.push("");
        for (const ca of classAssignments) {
            lines.push(ca);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=toMermaid.js.map