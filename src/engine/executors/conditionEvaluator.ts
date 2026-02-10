// ─── Shared Condition Evaluator ──────────────────────────────────────
// Centralised comparison logic used by Decision, Switch, and future
// control nodes that need field-vs-value evaluation.

export type ConditionOperator = '>' | '<' | '==' | '!=' | 'contains' | 'regex'

export const SUPPORTED_OPERATORS: ConditionOperator[] = [
  '==', '!=', '>', '<', 'contains', 'regex',
]

export function evaluateCondition(
  fieldValue: unknown,
  operator: ConditionOperator | string,
  compareValue: unknown,
): boolean {
  switch (operator) {
    case '>':
      return Number(fieldValue) > Number(compareValue)
    case '<':
      return Number(fieldValue) < Number(compareValue)
    case '==':
      return String(fieldValue) === String(compareValue)
    case '!=':
      return String(fieldValue) !== String(compareValue)
    case 'contains':
      return String(fieldValue).includes(String(compareValue))
    case 'regex': {
      try {
        const pattern = new RegExp(String(compareValue))
        return pattern.test(String(fieldValue))
      } catch {
        return false
      }
    }
    default:
      return false
  }
}
