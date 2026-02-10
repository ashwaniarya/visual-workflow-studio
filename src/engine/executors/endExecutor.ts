import type { NodeExecutor } from './nodeExecutor'
import type { WorkflowContext } from '../workflowContext'
import type { OutputPortDefinition } from '../../models/ports'

export class EndExecutor implements NodeExecutor {
  execute(
    _context: WorkflowContext,
    _config: Record<string, unknown>,
    _outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    return null
  }
}
