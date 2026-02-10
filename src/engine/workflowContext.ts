import type { ExecutionLogEntry } from '../models/executionLog'

export interface WorkflowContext {
  payload: Record<string, unknown>
  executionLog: ExecutionLogEntry[]
}
