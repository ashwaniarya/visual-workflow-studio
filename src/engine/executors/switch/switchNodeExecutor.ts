import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { evaluateCondition } from '../conditionEvaluator'

// ─── Switch Case Shape ───────────────────────────────────────────────

interface SwitchCaseEntry {
  label: string
  operator: string
  value: string
}

// ─── Switch Node Executor ────────────────────────────────────────────
// Evaluates each case (operator + value) against the shared targetField.
// Returns the output port for the first matching case, or the "default"
// port if none match.

export class SwitchNodeExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const targetField = config.targetField as string
    const cases = (config.cases as SwitchCaseEntry[]) ?? []
    const fieldValue = context.payload[targetField]

    // Try each case in order — first match wins
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
      const switchCase = cases[caseIndex]
      const isMatch = evaluateCondition(fieldValue, switchCase.operator, switchCase.value)

      if (isMatch) {
        const matchingPort = outputPorts.find((port) => port.id === `case-${caseIndex}`)
        return matchingPort ?? null
      }
    }

    // No case matched — fall through to the default port
    const defaultPort = outputPorts.find((port) => port.id === 'default')
    return defaultPort ?? null
  }
}
