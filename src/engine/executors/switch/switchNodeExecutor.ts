import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { evaluateCondition, SUPPORTED_OPERATORS } from '../conditionEvaluator'
import {
  NodeExecutionError,
  ExecutionErrorCode,
} from '../../errors/nodeExecutionError'

// ─── Switch Case Shape ───────────────────────────────────────────────

interface SwitchCaseEntry {
  label: string
  operator: string
  value: string
}

// ─── Switch Node Executor ────────────────────────────────────────────
// Evaluates each case (operator + value) against the shared targetField.
// Returns the output port for the first matching case, or the "default"
// port if none match. Throws NodeExecutionError on invalid config.

export class SwitchNodeExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string | undefined
    const cases = (config.cases as SwitchCaseEntry[]) ?? []

    // ── Guard: targetField must be configured ──────────────────────
    if (!targetField) {
      throw new NodeExecutionError(
        ExecutionErrorCode.MISSING_CONFIG_FIELD,
        'Switch node requires a "targetField" in its configuration.',
      )
    }

    // ── Guard: targetField must exist in payload ───────────────────
    if (!(targetField in context.payload)) {
      throw new NodeExecutionError(
        ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
        `Payload is missing the field "${targetField}" required by this Switch node.`,
      )
    }

    const fieldValue = context.payload[targetField]

    // Try each case in order — first match wins
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
      const switchCase: SwitchCaseEntry | undefined = cases[caseIndex]
      if (!switchCase) continue

      // ── Guard: operator must be valid ────────────────────────────
      if (!SUPPORTED_OPERATORS.includes(switchCase.operator as never)) {
        throw new NodeExecutionError(
          ExecutionErrorCode.INVALID_OPERATOR,
          `Case ${caseIndex} uses unsupported operator "${switchCase.operator}".`,
        )
      }

      const isMatch = evaluateCondition(fieldValue, switchCase.operator, switchCase.value)

      if (isMatch) {
        const matchingPort = outputPorts.find((port) => port.id === `case-${caseIndex}`)

        // ── Guard: port must exist for the matched case ────────────
        if (!matchingPort) {
          throw new NodeExecutionError(
            ExecutionErrorCode.PORT_NOT_FOUND,
            `Matched case ${caseIndex} but output port "case-${caseIndex}" is missing.`,
          )
        }

        return matchingPort
      }
    }

    // No case matched — fall through to the default port
    const defaultPort = outputPorts.find((port) => port.id === 'default')

    // ── Guard: default port must exist when no case matches ────────
    if (!defaultPort) {
      throw new NodeExecutionError(
        ExecutionErrorCode.PORT_NOT_FOUND,
        'No case matched and the "default" output port is missing.',
      )
    }

    return defaultPort
  }
}
