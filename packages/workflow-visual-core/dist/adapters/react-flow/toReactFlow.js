import { validateWorkflowGraph } from "../../core/validate.js";
import { ValidationFailedError } from "../../core/errors.js";
// ── Node type → React Flow type mapping ──────────────────
function mapNodeType(nodeType) {
    switch (nodeType) {
        case "start":
        case "end":
            return "rounded";
        case "decision":
            return "diamond";
        default:
            return "default";
    }
}
// ── Node style hints by type ──────────────────────────────
function nodeStyle(nodeType, status) {
    const base = {
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "500",
    };
    // Status overrides
    if (status === "warning" || nodeType === "warning") {
        return { ...base, background: "#fff3cd", border: "2px solid #ffc107", color: "#856404" };
    }
    if (status === "unresolved" || nodeType === "unresolved") {
        return { ...base, background: "#f8d7da", border: "2px solid #dc3545", color: "#721c24" };
    }
    if (status === "assumed") {
        return { ...base, background: "#d1ecf1", border: "2px dashed #17a2b8", color: "#0c5460" };
    }
    if (nodeType === "start") {
        return { ...base, background: "#d4edda", border: "2px solid #28a745", borderRadius: "24px" };
    }
    if (nodeType === "end") {
        return { ...base, background: "#cce5ff", border: "2px solid #004085", borderRadius: "24px" };
    }
    if (nodeType === "decision") {
        return { ...base, background: "#fff9c4", border: "2px solid #f9a825", transform: "rotate(0deg)" };
    }
    if (nodeType === "handoff") {
        return { ...base, background: "#e8eaf6", border: "2px solid #5c6bc0" };
    }
    if (nodeType === "external" || nodeType === "interface") {
        return { ...base, background: "#e2e3e5", border: "2px dashed #6c757d" };
    }
    if (nodeType === "system") {
        return { ...base, background: "#e3f2fd", border: "2px solid #1976d2" };
    }
    if (nodeType === "note") {
        return { ...base, background: "#fffde7", border: "1px solid #f9a825", fontStyle: "italic" };
    }
    return { ...base, background: "#ffffff", border: "1px solid #dee2e6" };
}
// ── Simple layered layout ─────────────────────────────────
// Assigns levels by longest path from source nodes, then positions by level
function computeLayeredLayout(nodes, edges, spacingX, spacingY) {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const adjOut = new Map();
    const adjIn = new Map();
    for (const n of nodes) {
        adjOut.set(n.id, []);
        adjIn.set(n.id, []);
    }
    for (const e of edges) {
        if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
            adjOut.get(e.from).push(e.to);
            adjIn.get(e.to).push(e.from);
        }
    }
    // BFS-based level assignment
    const levels = new Map();
    const queue = [];
    // Find roots (no incoming edges)
    for (const n of nodes) {
        const inEdges = adjIn.get(n.id) ?? [];
        if (inEdges.length === 0) {
            levels.set(n.id, 0);
            queue.push(n.id);
        }
    }
    // Handle disconnected nodes
    if (queue.length === 0 && nodes.length > 0) {
        const firstId = nodes[0].id;
        levels.set(firstId, 0);
        queue.push(firstId);
    }
    while (queue.length > 0) {
        const current = queue.shift();
        const currentLevel = levels.get(current) ?? 0;
        for (const neighbor of adjOut.get(current) ?? []) {
            const existingLevel = levels.get(neighbor) ?? -1;
            if (existingLevel < currentLevel + 1) {
                levels.set(neighbor, currentLevel + 1);
                queue.push(neighbor);
            }
        }
    }
    // Assign default level 0 to any unvisited nodes
    for (const n of nodes) {
        if (!levels.has(n.id)) {
            levels.set(n.id, 0);
        }
    }
    // Group nodes by level
    const levelGroups = new Map();
    for (const [nodeId, level] of levels) {
        if (!levelGroups.has(level))
            levelGroups.set(level, []);
        levelGroups.get(level).push(nodeId);
    }
    // Compute positions
    const positions = new Map();
    for (const [level, nodeIdsAtLevel] of levelGroups) {
        const totalWidth = (nodeIdsAtLevel.length - 1) * spacingX;
        nodeIdsAtLevel.forEach((nodeId, idx) => {
            positions.set(nodeId, {
                x: idx * spacingX - totalWidth / 2,
                y: level * spacingY,
            });
        });
    }
    return positions;
}
// ── Grid layout fallback ──────────────────────────────────
function computeGridLayout(nodes, spacingX, spacingY) {
    const positions = new Map();
    const cols = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((node, idx) => {
        positions.set(node.id, {
            x: (idx % cols) * spacingX,
            y: Math.floor(idx / cols) * spacingY,
        });
    });
    return positions;
}
// ── Edge style ────────────────────────────────────────────
function edgeStyle(edgeType, status) {
    if (status === "warning")
        return { stroke: "#ffc107", strokeWidth: 2 };
    if (status === "unresolved")
        return { stroke: "#dc3545", strokeWidth: 2, strokeDasharray: "5,5" };
    if (edgeType === "handoff" || edgeType === "reference") {
        return { stroke: "#5c6bc0", strokeWidth: 2, strokeDasharray: "6,3" };
    }
    if (edgeType === "exception")
        return { stroke: "#dc3545", strokeWidth: 1.5, strokeDasharray: "4,4" };
    if (edgeType === "feedback")
        return { stroke: "#17a2b8", strokeWidth: 2 };
    return { stroke: "#adb5bd", strokeWidth: 1.5 };
}
// ── Main export ───────────────────────────────────────────
export function toReactFlow(graph, options = {}) {
    if (!options.skipValidation) {
        const result = validateWorkflowGraph(graph);
        if (!result.ok) {
            throw new ValidationFailedError(`Cannot convert to React Flow: graph validation failed.\n` +
                result.errors.map((e) => `  - [${e.field}] ${e.message}`).join("\n"));
        }
    }
    const spacingX = options.nodeSpacingX ?? 220;
    const spacingY = options.nodeSpacingY ?? 120;
    const layoutStrategy = options.layout ?? "layered";
    let positions;
    if (layoutStrategy === "grid") {
        positions = computeGridLayout(graph.nodes, spacingX, spacingY);
    }
    else if (layoutStrategy === "none") {
        positions = new Map(graph.nodes.map((n) => [n.id, { x: 0, y: 0 }]));
    }
    else {
        positions = computeLayeredLayout(graph.nodes, graph.edges, spacingX, spacingY);
    }
    const nodes = graph.nodes.map((node) => ({
        id: node.id,
        type: mapNodeType(node.nodeType),
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
            label: node.label,
            nodeType: node.nodeType,
            description: node.description,
            lane: node.lane,
            layer: node.layer,
            status: node.status,
            markers: node.markers,
            originalNode: node,
        },
        style: nodeStyle(node.nodeType, node.status),
    }));
    const edges = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.label ?? edge.condition,
        type: edge.edgeType === "feedback" ? "smoothstep" : "default",
        animated: edge.edgeType === "handoff" || edge.edgeType === "feedback",
        style: edgeStyle(edge.edgeType, edge.status),
        data: {
            edgeType: edge.edgeType,
            condition: edge.condition,
            status: edge.status,
            originalEdge: edge,
        },
    }));
    return { nodes, edges };
}
//# sourceMappingURL=toReactFlow.js.map