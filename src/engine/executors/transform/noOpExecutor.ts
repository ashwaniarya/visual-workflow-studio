import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { requirePrimaryOutputPort } from './transformExecutorValidationPolicy'

export class NoOpExecutor implements NodeExecutor {
  execute(
    _context: WorkflowContext,
    _config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    return requirePrimaryOutputPort(outputPorts, 'No-op executor')
  }
}
