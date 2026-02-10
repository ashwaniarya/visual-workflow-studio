import { describe, it, expect } from 'vitest'
import { SwitchNodeExecutor } from './switchNodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'

// ─── Helpers ────────────────────────────────────────────────────────

function buildContext(payload: Record<string, unknown>): WorkflowContext {
  return { payload, executionLog: [] }
}

function buildPorts(caseCount: number, includeDefault = true): OutputPortDefinition[] {
  const ports: OutputPortDefinition[] = Array.from({ length: caseCount }, (_, index) => ({
    id: `case-${index}`,
    label: `Case ${index}`,
  }))
  if (includeDefault) {
    ports.push({ id: 'default', label: 'Default' })
  }
  return ports
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('SwitchNodeExecutor', () => {
  const executor = new SwitchNodeExecutor()

  // ── Equality (==) ───────────────────────────────────────────────

  it('🎯 returns matching port when == condition hits', () => {
    const context = buildContext({ status: 'active' })
    const config = {
      targetField: 'status',
      cases: [
        { label: 'Active', operator: '==', value: 'active' },
        { label: 'Inactive', operator: '==', value: 'inactive' },
      ],
    }
    const ports = buildPorts(2)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  it('🎯 returns second port when second case matches', () => {
    const context = buildContext({ status: 'inactive' })
    const config = {
      targetField: 'status',
      cases: [
        { label: 'Active', operator: '==', value: 'active' },
        { label: 'Inactive', operator: '==', value: 'inactive' },
      ],
    }
    const ports = buildPorts(2)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-1', label: 'Case 1' })
  })

  // ── First-match-wins ────────────────────────────────────────────

  it('🥇 returns first matching port when multiple cases match', () => {
    const context = buildContext({ score: '100' })
    const config = {
      targetField: 'score',
      cases: [
        { label: 'Hundred', operator: '==', value: '100' },
        { label: 'Also Hundred', operator: '==', value: '100' },
      ],
    }
    const ports = buildPorts(2)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  // ── Default fallback ────────────────────────────────────────────

  it('🔄 falls back to default port when no case matches', () => {
    const context = buildContext({ status: 'unknown' })
    const config = {
      targetField: 'status',
      cases: [
        { label: 'Active', operator: '==', value: 'active' },
        { label: 'Inactive', operator: '==', value: 'inactive' },
      ],
    }
    const ports = buildPorts(2)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'default', label: 'Default' })
  })

  it('🕳️ returns null when no case matches and no default port exists', () => {
    const context = buildContext({ status: 'unknown' })
    const config = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    const ports = buildPorts(1, false) // no default port

    const result = executor.execute(context, config, ports)

    expect(result).toBeNull()
  })

  // ── Empty / missing cases ───────────────────────────────────────

  it('📭 falls back to default when cases array is empty', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status', cases: [] }
    const ports = buildPorts(0)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'default', label: 'Default' })
  })

  it('📭 falls back to default when cases key is missing (undefined)', () => {
    const context = buildContext({ status: 'active' })
    const config = { targetField: 'status' }
    const ports = buildPorts(0)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'default', label: 'Default' })
  })

  // ── Operator variety ────────────────────────────────────────────

  it('🔢 matches with > operator (numeric comparison)', () => {
    const context = buildContext({ age: 25 })
    const config = {
      targetField: 'age',
      cases: [{ label: 'Over 18', operator: '>', value: '18' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  it('🔢 matches with < operator (numeric comparison)', () => {
    const context = buildContext({ temperature: 10 })
    const config = {
      targetField: 'temperature',
      cases: [{ label: 'Cold', operator: '<', value: '20' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  it('🚫 matches with != operator', () => {
    const context = buildContext({ role: 'admin' })
    const config = {
      targetField: 'role',
      cases: [{ label: 'Not Guest', operator: '!=', value: 'guest' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  it('🔍 matches with contains operator', () => {
    const context = buildContext({ email: 'user@example.com' })
    const config = {
      targetField: 'email',
      cases: [{ label: 'Has @', operator: 'contains', value: '@' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  it('🧩 matches with regex operator', () => {
    const context = buildContext({ code: 'ABC-123' })
    const config = {
      targetField: 'code',
      cases: [{ label: 'Pattern', operator: 'regex', value: '^[A-Z]+-\\d+$' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'case-0', label: 'Case 0' })
  })

  // ── Edge: missing targetField in payload ────────────────────────

  it('⚠️ falls back to default when targetField is absent from payload', () => {
    const context = buildContext({}) // no "status" key
    const config = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    const ports = buildPorts(1)

    const result = executor.execute(context, config, ports)

    expect(result).toEqual({ id: 'default', label: 'Default' })
  })

  // ── Edge: port missing for a matching case ──────────────────────

  it('⚠️ returns null when matching case index has no corresponding port', () => {
    const context = buildContext({ status: 'active' })
    const config = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    // Ports start at case-5 — no case-0 exists
    const ports: OutputPortDefinition[] = [
      { id: 'case-5', label: 'Case 5' },
      { id: 'default', label: 'Default' },
    ]

    const result = executor.execute(context, config, ports)

    expect(result).toBeNull()
  })
})
