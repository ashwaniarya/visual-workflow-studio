import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { evaluateCondition } from '../conditionEvaluator'

export class DropdownDecisionExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string
    const operator = config.operator as string
    const compareValue = config.compareValue as unknown

    const fieldValue = context.payload[targetField]
    const conditionResult = evaluateCondition(fieldValue, operator, compareValue)

    // outputPorts[0] = true-branch, outputPorts[1] = false-branch
    return conditionResult ? outputPorts[0] : outputPorts[1]
  }
}
