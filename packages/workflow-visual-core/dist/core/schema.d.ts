export declare const workflowGraphSchema: {
    readonly type: "object";
    readonly required: readonly ["graphId", "title", "version", "graphType", "nodes", "edges"];
    readonly additionalProperties: true;
    readonly properties: {
        readonly graphId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly title: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly description: {
            readonly type: "string";
        };
        readonly version: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly graphType: {
            readonly type: "string";
            readonly enum: readonly ["workflow", "decision_tree", "architecture", "roadmap", "dependency_map", "generic"];
        };
        readonly direction: {
            readonly type: "string";
            readonly enum: readonly ["TD", "LR", "RL", "BT"];
        };
        readonly nodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "label", "nodeType"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly nodeType: {
                        readonly type: "string";
                        readonly enum: readonly ["start", "end", "step", "decision", "handoff", "approval", "control", "system", "document", "interface", "external", "warning", "unresolved", "note", "group", "custom"];
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly lane: {
                        readonly type: "string";
                    };
                    readonly layer: {
                        readonly type: "string";
                    };
                    readonly status: {
                        readonly type: "string";
                        readonly enum: readonly ["confirmed", "assumed", "warning", "unresolved", "external_unvalidated", "out_of_scope"];
                    };
                    readonly markers: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly metadata: {
                        readonly type: "object";
                    };
                };
                readonly additionalProperties: true;
            };
        };
        readonly edges: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "from", "to"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly from: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly to: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly edgeType: {
                        readonly type: "string";
                        readonly enum: readonly ["sequence", "conditional", "handoff", "approval", "dependency", "reference", "exception", "feedback", "custom"];
                    };
                    readonly condition: {
                        readonly type: "string";
                    };
                    readonly status: {
                        readonly type: "string";
                        readonly enum: readonly ["confirmed", "assumed", "warning", "unresolved"];
                    };
                    readonly metadata: {
                        readonly type: "object";
                    };
                };
                readonly additionalProperties: true;
            };
        };
    };
};
//# sourceMappingURL=schema.d.ts.map