import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import {
  requireNumericPayloadField,
  requirePrimaryOutputPort,
  requireTargetField,
} from './transformExecutorValidationPolicy'

export class RoundExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const executorLabel = 'Round executor'
    const selectedOutputPort = requirePrimaryOutputPort(outputPorts, executorLabel)
    const targetField = requireTargetField(config, executorLabel)
    const currentValue = requireNumericPayloadField(context, targetField, executorLabel)

    context.payload[targetField] = Math.round(currentValue)
    return selectedOutputPort
  }
}
