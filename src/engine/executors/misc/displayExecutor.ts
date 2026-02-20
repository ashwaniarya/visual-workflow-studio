import type { NodeExecutor } from "../nodeExecutor";
import type { WorkflowContext } from "../../workflowContext";
import type { OutputPortDefinition } from "../../../models/ports";
import { ExecutionErrorCode, NodeExecutionError } from "../../errors/nodeExecutionError";

export class DisplayExecutor implements NodeExecutor {
  execute(
    _context: WorkflowContext,
    _config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition {
    // ── Guard: at least one output port must exist ──────────────────
    const outputPort = outputPorts[0]
    if (!outputPort) {
      throw new NodeExecutionError(ExecutionErrorCode.NO_OUTPUT_PORT, 'DisplayExecutor requires at least one output port')
    }
    return outputPort
  }
}