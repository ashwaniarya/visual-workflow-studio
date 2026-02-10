import type { ExecutionErrorCode } from '../engine/errors/nodeExecutionError'

export interface ExecutionLogEntry {
  stepNumber: number
  nodeId: string
  nodeLabel: string
  nodeType: string
  inputPayload: Record<string, unknown>
  outputPayload: Record<string, unknown>
  selectedPortId: string | null
  nextNodeId: string | null
  status: 'success' | 'error'
  errorMessage?: string
  errorCode?: ExecutionErrorCode
  timestamp: number
}
