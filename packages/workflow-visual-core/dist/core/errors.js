export class WorkflowVisualError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "WorkflowVisualError";
    }
}
export class ValidationFailedError extends WorkflowVisualError {
    constructor(message) {
        super(message, "VALIDATION_FAILED");
        this.name = "ValidationFailedError";
    }
}
export class AdapterError extends WorkflowVisualError {
    constructor(message) {
        super(message, "ADAPTER_ERROR");
        this.name = "AdapterError";
    }
}
//# sourceMappingURL=errors.js.map