export class WorkflowVisualError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "WorkflowVisualError";
  }
}

export class ValidationFailedError extends WorkflowVisualError {
  constructor(message: string) {
    super(message, "VALIDATION_FAILED");
    this.name = "ValidationFailedError";
  }
}

export class AdapterError extends WorkflowVisualError {
  constructor(message: string) {
    super(message, "ADAPTER_ERROR");
    this.name = "AdapterError";
  }
}
