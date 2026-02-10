import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { evaluateCondition, SUPPORTED_OPERATORS } from '../conditionEvaluator'
import {
  NodeExecutionError,
  ExecutionErrorCode,
} from '../../errors/nodeExecutionError'

export class DropdownDecisionExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string | undefined
    const operator = config.operator as string | undefined
    const compareValue = config.compareValue as unknown

    // ── Guard: targetField must be configured ──────────────────────
    if (!targetField) {
      throw new NodeExecutionError(
        ExecutionErrorCode.MISSING_CONFIG_FIELD,
        'Decision node requires a "targetField" in its configuration.',
      )
    }

    // ── Guard: operator must be configured ─────────────────────────
    if (!operator) {
      throw new NodeExecutionError(
        ExecutionErrorCode.MISSING_CONFIG_FIELD,
        'Decision node requires an "operator" in its configuration.',
      )
    }

    // ── Guard: operator must be valid ──────────────────────────────
    if (!SUPPORTED_OPERATORS.includes(operator as never)) {
      throw new NodeExecutionError(
        ExecutionErrorCode.INVALID_OPERATOR,
        `Decision node uses unsupported operator "${operator}".`,
      )
    }

    // ── Guard: targetField must exist in payload ───────────────────
    if (!(targetField in context.payload)) {
      throw new NodeExecutionError(
        ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
        `Payload is missing the field "${targetField}" required by this Decision node.`,
      )
    }

    // ── Guard: true/false branch ports must exist ──────────────────
    if (!outputPorts[0] || !outputPorts[1]) {
      throw new NodeExecutionError(
        ExecutionErrorCode.NO_OUTPUT_PORT,
        'Decision node requires exactly 2 output ports (true-branch and false-branch).',
      )
    }

    const fieldValue = context.payload[targetField]
    const conditionResult = evaluateCondition(fieldValue, operator, compareValue)

    // outputPorts[0] = true-branch, outputPorts[1] = false-branch
    return conditionResult ? outputPorts[0] : outputPorts[1]
  }
}
