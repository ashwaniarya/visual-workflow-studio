import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

export class AppendExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string
    const operand = config.operand as string
    const currentValue = context.payload[targetField]
    if (typeof currentValue === 'string') {
      context.payload[targetField] = currentValue + operand
    }
    return outputPorts[0] ?? null
  }
}
