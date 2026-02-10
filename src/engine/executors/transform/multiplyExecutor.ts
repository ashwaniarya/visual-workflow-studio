import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

export class MultiplyExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string
    const operand = Number(config.operand)
    const currentValue = context.payload[targetField]
    if (typeof currentValue === 'number') {
      context.payload[targetField] = currentValue * operand
    }
    return outputPorts[0] ?? null
  }
}
