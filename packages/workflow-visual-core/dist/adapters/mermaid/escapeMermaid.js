/**
 * Escape a string for safe use inside Mermaid node labels.
 * Mermaid is sensitive to quotes, brackets, and special chars.
 */
export function escapeMermaidLabel(text) {
    return text
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\[/g, "&#91;")
        .replace(/\]/g, "&#93;")
        .replace(/\(/g, "&#40;")
        .replace(/\)/g, "&#41;")
        .replace(/\{/g, "&#123;")
        .replace(/\}/g, "&#125;")
        .replace(/\|/g, "&#124;")
        .replace(/\n/g, " ")
        .trim();
}
// Mermaid reserved keywords that cause parse errors when used as node IDs
const MERMAID_RESERVED = new Set([
    "end", "start", "subgraph", "graph", "flowchart", "classDef", "class",
    "click", "style", "linkStyle", "direction", "LR", "RL", "TD", "TB", "BT",
]);
/**
 * Sanitize a node ID for Mermaid (no spaces or special chars).
 * Prefixes reserved keywords with n_ to avoid parse errors.
 */
export function sanitizeNodeId(id) {
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return MERMAID_RESERVED.has(sanitized) ? `n_${sanitized}` : sanitized;
}
//# sourceMappingURL=escapeMermaid.js.map