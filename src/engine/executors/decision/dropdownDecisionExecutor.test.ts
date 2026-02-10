import { describe, it, expect } from 'vitest'
import { DropdownDecisionExecutor } from './dropdownDecisionExecutor'
import { NodeExecutionError, ExecutionErrorCode } from '../../errors/nodeExecutionError'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

// ─── Helpers ────────────────────────────────────────────────────────

function buildContext(payload: Record<string, unknown>): WorkflowContext {
  return { payload, executionLog: [] }
}

const TRUE_PORT: OutputPortDefinition = { id: 'true', label: 'True' }
const FALSE_PORT: OutputPortDefinition = { id: 'false', label: 'False' }
const BOTH_PORTS: OutputPortDefinition[] = [TRUE_PORT, FALSE_PORT]

// ─── Tests ──────────────────────────────────────────────────────────

describe('DropdownDecisionExecutor', () => {
  const executor = new DropdownDecisionExecutor()

  // ── Happy path ──────────────────────────────────────────────────

  it('🎯 returns true-branch when == condition matches', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status', operator: '==', compareValue: 'active' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(TRUE_PORT)
  })

  it('🎯 returns false-branch when == condition does not match', () => {
    const context = buildContext({ status: 'inactive' })
    const config = { targetField: 'status', operator: '==', compareValue: 'active' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(FALSE_PORT)
  })

  it('🔢 returns true-branch for > numeric comparison', () => {
    const context = buildContext({ age: 25 })
    const config = { targetField: 'age', operator: '>', compareValue: '18' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(TRUE_PORT)
  })

  it('🔢 returns false-branch for < when value is larger', () => {
    const context = buildContext({ temperature: 30 })
    const config = { targetField: 'temperature', operator: '<', compareValue: '20' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(FALSE_PORT)
  })

  it('🚫 returns true-branch for != when values differ', () => {
    const context = buildContext({ role: 'admin' })
    const config = { targetField: 'role', operator: '!=', compareValue: 'guest' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(TRUE_PORT)
  })

  it('🔍 returns true-branch for contains match', () => {
    const context = buildContext({ email: 'user@example.com' })
    const config = { targetField: 'email', operator: 'contains', compareValue: '@' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(TRUE_PORT)
  })

  it('🧩 returns true-branch for regex match', () => {
    const context = buildContext({ code: 'ABC-123' })
    const config = { targetField: 'code', operator: 'regex', compareValue: '^[A-Z]+-\\d+$' }

    expect(executor.execute(context, config, BOTH_PORTS)).toEqual(TRUE_PORT)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛡️ Guard — MISSING_CONFIG_FIELD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ status: 'active' })
    const config = { operator: '==', compareValue: 'active' }

    expect(() => executor.execute(context, config, BOTH_PORTS)).toThrowError(NodeExecutionError)
    try { executor.execute(context, config, BOTH_PORTS) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.MISSING_CONFIG_FIELD)
    }
  })

  it('💥 throws MISSING_CONFIG_FIELD when operator is missing', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status', compareValue: 'active' }

    expect(() => executor.execute(context, config, BOTH_PORTS)).toThrowError(NodeExecutionError)
    try { executor.execute(context, config, BOTH_PORTS) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.MISSING_CONFIG_FIELD)
    }
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛡️ Guard — INVALID_OPERATOR
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('💥 throws INVALID_OPERATOR for unsupported operator', () => {
    const context = buildContext({ score: 50 })
    const config = { targetField: 'score', operator: 'BETWEEN', compareValue: '10' }

    expect(() => executor.execute(context, config, BOTH_PORTS)).toThrowError(NodeExecutionError)
    try { executor.execute(context, config, BOTH_PORTS) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.INVALID_OPERATOR)
    }
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛡️ Guard — MISSING_PAYLOAD_FIELD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('💥 throws MISSING_PAYLOAD_FIELD when targetField absent from payload', () => {
    const context = buildContext({})
    const config = { targetField: 'status', operator: '==', compareValue: 'active' }

    expect(() => executor.execute(context, config, BOTH_PORTS)).toThrowError(NodeExecutionError)
    try { executor.execute(context, config, BOTH_PORTS) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.MISSING_PAYLOAD_FIELD)
    }
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛡️ Guard — NO_OUTPUT_PORT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status', operator: '==', compareValue: 'active' }

    expect(() => executor.execute(context, config, [])).toThrowError(NodeExecutionError)
    try { executor.execute(context, config, []) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.NO_OUTPUT_PORT)
    }
  })

  it('💥 throws NO_OUTPUT_PORT when only one port exists (missing false-branch)', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status', operator: '==', compareValue: 'active' }

    expect(() => executor.execute(context, config, [TRUE_PORT])).toThrowError(NodeExecutionError)
  })
})
