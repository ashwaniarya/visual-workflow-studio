// Use case:
// - Owns workflow persistence boundaries: autosave, storage snapshot restore, import/export.
// Safe additions:
// - Serialization policy, autosave timers/indicators, storage adapters.
// Avoid adding:
// - Graph editing primitives, workflow execution engine calls, command history internals.
import { defineStore } from 'pinia'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { WorkNodeSerialization } from '../serialization/workNodeSerialization'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import { useWorkflowGraphStore } from './workflowGraphStore'
import { useWorkflowHistoryStore } from './workflowHistoryStore'
import { useWorkflowExecutionStore } from './workflowExecutionStore'

const workNodeSerialization = new WorkNodeSerialization()

interface WorkflowPersistenceState {
  isWorkflowAutosaveInProgress: boolean
  lastWorkflowAutosavedTimestamp: number | null
  workflowAutosaveDebounceTimerId: ReturnType<typeof setTimeout> | null
  workflowAutosaveIndicatorTimerId: ReturnType<typeof setTimeout> | null
}

export const useWorkflowPersistenceStore = defineStore('workflowPersistence', {
  state: (): WorkflowPersistenceState => ({
    isWorkflowAutosaveInProgress: false,
    lastWorkflowAutosavedTimestamp: null,
    workflowAutosaveDebounceTimerId: null,
    workflowAutosaveIndicatorTimerId: null,
  }),

  actions: {
    beginWorkflowAutosaveIndicator() {
      this.isWorkflowAutosaveInProgress = true

      if (this.workflowAutosaveIndicatorTimerId !== null) {
        clearTimeout(this.workflowAutosaveIndicatorTimerId)
        this.workflowAutosaveIndicatorTimerId = null
      }
    },

    finishWorkflowAutosaveIndicator() {
      if (typeof window === 'undefined') {
        this.isWorkflowAutosaveInProgress = false
        this.workflowAutosaveIndicatorTimerId = null
        return
      }

      this.workflowAutosaveIndicatorTimerId = window.setTimeout(() => {
        this.isWorkflowAutosaveInProgress = false
        this.workflowAutosaveIndicatorTimerId = null
      }, WORKFLOW_CONSTANTS.WORKFLOW_SAVE_INDICATOR_MIN_VISIBLE_MS)
    },

    scheduleWorkflowAutosave() {
      if (typeof window === 'undefined') {
        return
      }

      if (this.workflowAutosaveDebounceTimerId !== null) {
        clearTimeout(this.workflowAutosaveDebounceTimerId)
      }

      this.workflowAutosaveDebounceTimerId = window.setTimeout(() => {
        this.workflowAutosaveDebounceTimerId = null
        this.persistWorkflowSnapshotToStorage()
      }, WORKFLOW_CONSTANTS.WORKFLOW_AUTOSAVE_DEBOUNCE_MS)
    },

    async waitForAutosaveToSettle() {
      if (typeof window === 'undefined' || !this.isWorkflowAutosaveInProgress) {
        return
      }

      await new Promise<void>((resolve) => {
        const autosaveStatusPollIntervalMilliseconds = 40
        const autosaveStatusPollTimerId = window.setInterval(() => {
          if (!this.isWorkflowAutosaveInProgress) {
            window.clearInterval(autosaveStatusPollTimerId)
            resolve()
          }
        }, autosaveStatusPollIntervalMilliseconds)
      })
    },

    persistWorkflowSnapshotToStorage() {
      if (typeof window === 'undefined') {
        return
      }

      const workflowGraphStore = useWorkflowGraphStore()
      this.beginWorkflowAutosaveIndicator()
      try {
        const workflowJsonString = this.exportWorkflow(
          workflowGraphStore.graphNodes,
          workflowGraphStore.graphEdges,
        )
        window.localStorage.setItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY, workflowJsonString)
        this.lastWorkflowAutosavedTimestamp = Date.now()
      } finally {
        this.finishWorkflowAutosaveIndicator()
      }
    },

    restoreWorkflowSnapshotFromStorage(): boolean {
      if (typeof window === 'undefined') {
        return false
      }

      const workflowJsonString = window.localStorage.getItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY)
      if (!workflowJsonString) {
        return false
      }

      const workflowGraphStore = useWorkflowGraphStore()
      const workflowHistoryStore = useWorkflowHistoryStore()
      const workflowExecutionStore = useWorkflowExecutionStore()

      try {
        const { nodes, edges } = workNodeSerialization.deserialise(workflowJsonString)
        workflowGraphStore.replaceGraphData(nodes, edges, { shouldAutosave: false })
        workflowGraphStore.setSelectedNode(null)
        workflowHistoryStore.clearUiCommandHistory()
        workflowExecutionStore.clearExecutionLog()
        return true
      } catch {
        window.localStorage.removeItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY)
        return false
      }
    },

    clearPersistedWorkflowSnapshot() {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.removeItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY)
    },

    exportWorkflow(nodes: RenderWorkNode[], edges: Edge[]): string {
      return workNodeSerialization.serialise(nodes, edges)
    },

    importWorkflow(jsonString: string): boolean {
      const workflowGraphStore = useWorkflowGraphStore()
      const workflowHistoryStore = useWorkflowHistoryStore()
      const workflowExecutionStore = useWorkflowExecutionStore()

      try {
        const { nodes, edges } = workNodeSerialization.deserialise(jsonString)
        workflowGraphStore.replaceGraphData(nodes, edges, { shouldAutosave: true })
        workflowGraphStore.setSelectedNode(null)
        workflowHistoryStore.clearUiCommandHistory()
        workflowExecutionStore.clearExecutionLog()
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        workflowExecutionStore.setImportExecutionError(errorMessage)
        return false
      }
    },
  },
})
