// Use case:
// - Owns UI command history lifecycle (run/undo/redo/depth tracking).
// Safe additions:
// - History policies, command stack behavior, command metrics.
// Avoid adding:
// - Direct graph mutation details, autosave implementation, storage/execution concerns.
import { defineStore } from 'pinia'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import type { WorkflowCommand } from './helpers/workflowCommandHistory'
import { WorkflowCommandHistory } from './helpers/workflowCommandHistory'

interface WorkflowHistoryState {
  workflowCommandHistory: WorkflowCommandHistory
  undoCommandDepth: number
  redoCommandDepth: number
}

export const useWorkflowHistoryStore = defineStore('workflowHistory', {
  state: (): WorkflowHistoryState => ({
    workflowCommandHistory: new WorkflowCommandHistory(
      WORKFLOW_CONSTANTS.MAX_UNDO_REDO_HISTORY_STEPS,
    ),
    undoCommandDepth: 0,
    redoCommandDepth: 0,
  }),

  getters: {
    canUndoUiAction(state): boolean {
      return state.undoCommandDepth > 0
    },

    canRedoUiAction(state): boolean {
      return state.redoCommandDepth > 0
    },
  },

  actions: {
    synchronizeCommandHistoryDepths() {
      this.undoCommandDepth = this.workflowCommandHistory.undoDepth
      this.redoCommandDepth = this.workflowCommandHistory.redoDepth
    },

    clearUiCommandHistory() {
      this.workflowCommandHistory.clear()
      this.synchronizeCommandHistoryDepths()
    },

    runUiCommand(
      workflowCommand: WorkflowCommand,
      options?: { shouldAutosave?: boolean; onAutosaveRequested?: () => void },
    ): boolean {
      const hasCommandExecuted = this.workflowCommandHistory.runCommand(workflowCommand)
      this.synchronizeCommandHistoryDepths()
      if (hasCommandExecuted && options?.shouldAutosave !== false) {
        options?.onAutosaveRequested?.()
      }
      return hasCommandExecuted
    },

    undoLastUiAction(options?: { shouldAutosave?: boolean; onAutosaveRequested?: () => void }): boolean {
      const hasUndoApplied = this.workflowCommandHistory.undo()
      this.synchronizeCommandHistoryDepths()
      if (hasUndoApplied && options?.shouldAutosave !== false) {
        options?.onAutosaveRequested?.()
      }
      return hasUndoApplied
    },

    redoLastUiAction(options?: { shouldAutosave?: boolean; onAutosaveRequested?: () => void }): boolean {
      const hasRedoApplied = this.workflowCommandHistory.redo()
      this.synchronizeCommandHistoryDepths()
      if (hasRedoApplied && options?.shouldAutosave !== false) {
        options?.onAutosaveRequested?.()
      }
      return hasRedoApplied
    },
  },
})
