import { describe, expect, it } from 'vitest'
import { WorkflowCommandHistory, type WorkflowCommand } from './workflowCommandHistory'

function createCounterCommand(counterState: { value: number }, step: number): WorkflowCommand {
  return {
    type: 'COUNTER_STEP',
    execute: () => {
      counterState.value += step
      return true
    },
    undo: () => {
      counterState.value -= step
      return true
    },
    redo: () => {
      counterState.value += step
      return true
    },
  }
}

describe('workflowCommandHistory', () => {
  it('runs commands and supports undo redo traversal', () => {
    const workflowCommandHistory = new WorkflowCommandHistory(10)
    const counterState = { value: 0 }

    workflowCommandHistory.runCommand(createCounterCommand(counterState, 2))
    workflowCommandHistory.runCommand(createCounterCommand(counterState, 3))

    expect(counterState.value).toBe(5)
    expect(workflowCommandHistory.canUndo).toBe(true)
    expect(workflowCommandHistory.canRedo).toBe(false)

    workflowCommandHistory.undo()
    expect(counterState.value).toBe(2)
    expect(workflowCommandHistory.canRedo).toBe(true)

    workflowCommandHistory.redo()
    expect(counterState.value).toBe(5)
    expect(workflowCommandHistory.canRedo).toBe(false)
  })

  it('clears redo stack after new command following undo', () => {
    const workflowCommandHistory = new WorkflowCommandHistory(10)
    const counterState = { value: 0 }

    workflowCommandHistory.runCommand(createCounterCommand(counterState, 5))
    workflowCommandHistory.runCommand(createCounterCommand(counterState, 3))
    workflowCommandHistory.undo()
    expect(workflowCommandHistory.canRedo).toBe(true)

    workflowCommandHistory.runCommand(createCounterCommand(counterState, 1))

    expect(counterState.value).toBe(6)
    expect(workflowCommandHistory.canRedo).toBe(false)
  })

  it('truncates oldest commands when max depth is reached', () => {
    const workflowCommandHistory = new WorkflowCommandHistory(2)
    const counterState = { value: 0 }

    workflowCommandHistory.runCommand(createCounterCommand(counterState, 1))
    workflowCommandHistory.runCommand(createCounterCommand(counterState, 2))
    workflowCommandHistory.runCommand(createCounterCommand(counterState, 3))

    expect(counterState.value).toBe(6)
    expect(workflowCommandHistory.undoDepth).toBe(2)

    workflowCommandHistory.undo()
    workflowCommandHistory.undo()
    const hasAnyRemainingUndo = workflowCommandHistory.undo()

    expect(counterState.value).toBe(1)
    expect(hasAnyRemainingUndo).toBe(false)
  })
})
