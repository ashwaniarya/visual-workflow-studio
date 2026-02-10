import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import {
  requireNumericOperand,
  requireNumericPayloadField,
  requirePrimaryOutputPort,
  requireTargetField,
} from './transformExecutorValidationPolicy'

export class AddExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const executorLabel = 'Add executor'
    const selectedOutputPort = requirePrimaryOutputPort(outputPorts, executorLabel)
    const targetField = requireTargetField(config, executorLabel)
    const operand = requireNumericOperand(config, executorLabel)
    const currentValue = requireNumericPayloadField(context, targetField, executorLabel)

    context.payload[targetField] = currentValue + operand
    return selectedOutputPort
  }
}
