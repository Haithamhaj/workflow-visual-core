export declare class WorkflowVisualError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class ValidationFailedError extends WorkflowVisualError {
    constructor(message: string);
}
export declare class AdapterError extends WorkflowVisualError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map