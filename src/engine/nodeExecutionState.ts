import type { ExecutionErrorCode } from './errors/nodeExecutionError'

// ─── Per-Node Execution State ────────────────────────────────────────
// Tracks the outcome of each node after a workflow run.
// The UI reads this map to paint success/error borders on nodes.

export type NodeExecutionStatus = 'success' | 'error' | 'skipped'

export interface NodeExecutionState {
  status: NodeExecutionStatus
  errorMessage?: string
  errorCode?: ExecutionErrorCode
}

// Keyed by nodeId
export type NodeExecutionStateMap = Map<string, NodeExecutionState>

// ─── Workflow Execution Result ───────────────────────────────────────
// Returned by executeWorkflow — gives the store both the log and the
// per-node state map in a single object.

import type { ExecutionLogEntry } from '../models/executionLog'

export interface WorkflowExecutionResult {
  executionLog: ExecutionLogEntry[]
  nodeExecutionStateMap: NodeExecutionStateMap
}
