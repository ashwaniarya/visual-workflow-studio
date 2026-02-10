import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

export class LowercaseExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string
    const currentValue = context.payload[targetField]
    if (typeof currentValue === 'string') {
      context.payload[targetField] = currentValue.toLowerCase()
    }
    return outputPorts[0] ?? null
  }
}
