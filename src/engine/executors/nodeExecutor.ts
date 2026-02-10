import type { WorkflowContext } from '../workflowContext'
import type { OutputPortDefinition } from '../../models/ports'

export interface NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null
}
