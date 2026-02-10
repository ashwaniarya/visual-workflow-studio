import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import {
  requirePrimaryOutputPort,
  requireStringPayloadField,
  requireTargetField,
} from './transformExecutorValidationPolicy'

export class UppercaseExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const executorLabel = 'Uppercase executor'
    const selectedOutputPort = requirePrimaryOutputPort(outputPorts, executorLabel)
    const targetField = requireTargetField(config, executorLabel)
    const currentValue = requireStringPayloadField(context, targetField, executorLabel)

    context.payload[targetField] = currentValue.toUpperCase()
    return selectedOutputPort
  }
}
