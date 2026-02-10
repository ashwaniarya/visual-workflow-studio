import type { NodeExecutor } from './nodeExecutor'
import type { WorkflowContext } from '../workflowContext'
import type { OutputPortDefinition } from '../../models/ports'

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
    return outputPorts[0] ?? null
  }
}
