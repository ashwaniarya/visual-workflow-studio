// Use case:
// - Owns workflow runtime execution state and run lifecycle only.
// Safe additions:
// - Execution-only flags, run metadata, or runtime error mapping.
// Avoid adding:
// - Graph mutation logic, autosave/localStorage logic, undo/redo logic.
import { defineStore } from 'pinia'
import type { ExecutionLogEntry } from '../models/executionLog'
import type { NodeExecutionStateMap } from '../engine/nodeExecutionState'
import { executeWorkflow } from '../engine/workflowEngine'
import { useWorkflowGraphStore } from './workflowGraphStore'

interface WorkflowExecutionState {
  executionLog: ExecutionLogEntry[]
  isExecuting: boolean
  nodeExecutionStateMap: NodeExecutionStateMap
}

function createSystemExecutionErrorLog(errorMessage: string): ExecutionLogEntry {
  return {
    stepNumber: 0,
    nodeId: 'SYSTEM',
    nodeLabel: 'System Error',
    nodeType: 'ERROR',
    inputPayload: {},
    outputPayload: {},
    selectedPortId: null,
    nextNodeId: null,
    status: 'error',
    errorMessage,
    timestamp: Date.now(),
  }
}

function createImportExecutionErrorLog(errorMessage: string): ExecutionLogEntry {
  return {
    stepNumber: 0,
    nodeId: 'SYSTEM',
    nodeLabel: 'Import Error',
    nodeType: 'ERROR',
    inputPayload: {},
    outputPayload: {},
    selectedPortId: null,
    nextNodeId: null,
    status: 'error',
    errorMessage,
    timestamp: Date.now(),
  }
}

export const useWorkflowExecutionStore = defineStore('workflowExecution', {
  state: (): WorkflowExecutionState => ({
    executionLog: [],
    isExecuting: false,
    nodeExecutionStateMap: new Map(),
  }),

  actions: {
    runWorkflow() {
      const workflowGraphStore = useWorkflowGraphStore()
      this.isExecuting = true
      this.executionLog = []
      this.nodeExecutionStateMap = new Map()
      try {
        const result = executeWorkflow(workflowGraphStore.graphNodes, workflowGraphStore.graphEdges)
        this.executionLog = result.executionLog
        this.nodeExecutionStateMap = result.nodeExecutionStateMap
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.executionLog = [createSystemExecutionErrorLog(errorMessage)]
      } finally {
        this.isExecuting = false
      }
    },

    clearExecutionLog() {
      this.executionLog = []
      this.nodeExecutionStateMap = new Map()
    },

    setImportExecutionError(errorMessage: string) {
      this.executionLog = [createImportExecutionErrorLog(errorMessage)]
      this.nodeExecutionStateMap = new Map()
    },
  },
})
