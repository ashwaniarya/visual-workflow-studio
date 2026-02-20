import type { ExecutionErrorCode } from './errors/nodeExecutionError'
import type { ExecutionLogEntry } from '../models/executionLog'

// ─── Per-Node Execution State ────────────────────────────────────────
// Tracks the outcome of each node after a workflow run.
// The UI reads this map to paint success/error borders on nodes.

export type NodeExecutionStatus = 'success' | 'error' | 'skipped'

export interface NodeExecutionState {
  status: NodeExecutionStatus
  errorMessage?: string
  metaData: ExecutionLogEntry
  errorCode?: ExecutionErrorCode
}

// Keyed by nodeId
export type NodeExecutionStateMap = Map<string, NodeExecutionState>

// ─── Workflow Execution Result ───────────────────────────────────────
// Returned by executeWorkflow — gives the store both the log and the
// per-node state map in a single object.


export interface WorkflowExecutionResult {
  executionLog: ExecutionLogEntry[]
  nodeExecutionStateMap: NodeExecutionStateMap
}
