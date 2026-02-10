import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import {
  requirePrimaryOutputPort,
  requireStringOperand,
  requireStringPayloadField,
  requireTargetField,
} from './transformExecutorValidationPolicy'

export class AppendExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const executorLabel = 'Append executor'
    const selectedOutputPort = requirePrimaryOutputPort(outputPorts, executorLabel)
    const targetField = requireTargetField(config, executorLabel)
    const operand = requireStringOperand(config, executorLabel)
    const currentValue = requireStringPayloadField(context, targetField, executorLabel)

    context.payload[targetField] = currentValue + operand
    return selectedOutputPort
  }
}
