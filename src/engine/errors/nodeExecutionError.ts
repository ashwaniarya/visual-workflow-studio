// ─── Execution Error Codes ───────────────────────────────────────────
// Centralised enum of every typed failure an executor can report.
// Engine & UI layers consume these to decide severity and display.

export enum ExecutionErrorCode {
  MISSING_CONFIG_FIELD = 'MISSING_CONFIG_FIELD',
  MISSING_PAYLOAD_FIELD = 'MISSING_PAYLOAD_FIELD',
  PORT_NOT_FOUND = 'PORT_NOT_FOUND',
  INVALID_OPERATOR = 'INVALID_OPERATOR',
  INVALID_CONFIG_VALUE = 'INVALID_CONFIG_VALUE',
  NO_OUTPUT_PORT = 'NO_OUTPUT_PORT',
}

// ─── Custom Error ────────────────────────────────────────────────────
// Thrown by executors when a recoverable user-configuration problem is
// detected. The engine's try/catch captures these and enriches the
// execution log with both errorCode + human-readable message.

export class NodeExecutionError extends Error {
  constructor(
    public readonly errorCode: ExecutionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'NodeExecutionError'
  }
}
