export interface WorkflowCommand {
  type: string
  execute: () => boolean
  undo: () => boolean
  redo?: () => boolean
}

export class WorkflowCommandHistory {
  private undoStack: WorkflowCommand[] = []
  private redoStack: WorkflowCommand[] = []
  private readonly maximumUndoSteps: number

  constructor(maximumUndoSteps: number) {
    this.maximumUndoSteps = Math.max(1, Math.floor(maximumUndoSteps))
  }

  runCommand(command: WorkflowCommand): boolean {
    const hasCommandExecuted = command.execute()
    if (!hasCommandExecuted) {
      return false
    }

    this.undoStack.push(command)
    if (this.undoStack.length > this.maximumUndoSteps) {
      this.undoStack.shift()
    }
    this.redoStack.length = 0
    return true
  }

  undo(): boolean {
    const latestCommand = this.undoStack.pop()
    if (!latestCommand) {
      return false
    }

    const hasCommandUndone = latestCommand.undo()
    if (!hasCommandUndone) {
      this.undoStack.push(latestCommand)
      return false
    }

    this.redoStack.push(latestCommand)
    return true
  }

  redo(): boolean {
    const latestUndoneCommand = this.redoStack.pop()
    if (!latestUndoneCommand) {
      return false
    }

    const hasCommandRedone = latestUndoneCommand.redo
      ? latestUndoneCommand.redo()
      : latestUndoneCommand.execute()
    if (!hasCommandRedone) {
      this.redoStack.push(latestUndoneCommand)
      return false
    }

    this.undoStack.push(latestUndoneCommand)
    return true
  }

  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoDepth(): number {
    return this.undoStack.length
  }

  get redoDepth(): number {
    return this.redoStack.length
  }
}
