import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

export class NoOpExecutor implements NodeExecutor {
  execute(
    _context: WorkflowContext,
    _config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    return outputPorts[0] ?? null
  }
}
