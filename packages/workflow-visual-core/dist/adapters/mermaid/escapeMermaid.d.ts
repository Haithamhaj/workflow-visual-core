/**
 * Escape a string for safe use inside Mermaid node labels.
 * Mermaid is sensitive to quotes, brackets, and special chars.
 */
export declare function escapeMermaidLabel(text: string): string;
/**
 * Sanitize a node ID for Mermaid (no spaces or special chars).
 * Prefixes reserved keywords with n_ to avoid parse errors.
 */
export declare function sanitizeNodeId(id: string): string;
//# sourceMappingURL=escapeMermaid.d.ts.map