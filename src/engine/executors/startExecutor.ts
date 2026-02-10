import type { NodeExecutor } from './nodeExecutor'
import type { WorkflowContext } from '../workflowContext'
import type { OutputPortDefinition } from '../../models/ports'
import {
  NodeExecutionError,
  ExecutionErrorCode,
} from '../errors/nodeExecutionError'

export class StartExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const inputPayload = config.inputPayload as Record<string, unknown> | undefined
    if (inputPayload) {
      Object.assign(context.payload, inputPayload)
    }

    // ── Guard: at least one output port must exist ──────────────────
    if (!outputPorts[0]) {
      throw new NodeExecutionError(
        ExecutionErrorCode.NO_OUTPUT_PORT,
        'Start node requires at least one output port to continue the workflow.',
      )
    }

    return outputPorts[0]
  }
}
