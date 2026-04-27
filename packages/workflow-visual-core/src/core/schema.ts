export const workflowGraphSchema = {
  type: "object",
  required: ["graphId", "title", "version", "graphType", "nodes", "edges"],
  additionalProperties: true,
  properties: {
    graphId: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    description: { type: "string" },
    version: { type: "string", minLength: 1 },
    graphType: {
      type: "string",
      enum: ["workflow", "decision_tree", "architecture", "roadmap", "dependency_map", "generic"],
    },
    direction: {
      type: "string",
      enum: ["TD", "LR", "RL", "BT"],
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "label", "nodeType"],
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          nodeType: {
            type: "string",
            enum: [
              "start", "end", "step", "decision", "handoff",
              "approval", "control", "system", "document",
              "interface", "external", "warning", "unresolved",
              "note", "group", "custom",
            ],
          },
          description: { type: "string" },
          lane: { type: "string" },
          layer: { type: "string" },
          status: {
            type: "string",
            enum: ["confirmed", "assumed", "warning", "unresolved", "external_unvalidated", "out_of_scope"],
          },
          markers: { type: "array", items: { type: "string" } },
          colors: {
            type: "object",
            properties: {
              bg: { type: "string" },
              border: { type: "string" },
              color: { type: "string" },
              radius: { type: "string" },
            },
            required: ["bg", "border", "color"],
            additionalProperties: false,
          },
          metadata: { type: "object" },
        },
        additionalProperties: true,
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "from", "to"],
        properties: {
          id: { type: "string", minLength: 1 },
          from: { type: "string", minLength: 1 },
          to: { type: "string", minLength: 1 },
          label: { type: "string" },
          edgeType: {
            type: "string",
            enum: [
              "sequence", "conditional", "handoff", "approval",
              "dependency", "reference", "exception", "feedback", "custom",
            ],
          },
          condition: { type: "string" },
          status: {
            type: "string",
            enum: ["confirmed", "assumed", "warning", "unresolved"],
          },
          metadata: { type: "object" },
        },
        additionalProperties: true,
      },
    },
  },
} as const;
