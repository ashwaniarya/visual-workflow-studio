import { describe, it, expect } from 'vitest'
import { StartExecutor } from './startExecutor'
import { NodeExecutionError, ExecutionErrorCode } from '../errors/nodeExecutionError'
import type { WorkflowContext } from '../workflowContext'
import type { OutputPortDefinition } from '../../models/ports'

// ─── Helpers ────────────────────────────────────────────────────────

function buildContext(payload: Record<string, unknown> = {}): WorkflowContext {
  return { payload, executionLog: [] }
}

const OUTPUT_PORT: OutputPortDefinition = { id: 'out-0', label: 'Output' }

// ─── Tests ──────────────────────────────────────────────────────────

describe('StartExecutor', () => {
  const executor = new StartExecutor()

  // ── Happy path ──────────────────────────────────────────────────

  it('▶️ returns first output port', () => {
    const context = buildContext()
    const result = executor.execute(context, {}, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
  })

  it('▶️ merges inputPayload into context.payload', () => {
    const context = buildContext({ existing: 'data' })
    const config = { inputPayload: { name: 'Alice', age: 30 } }

    executor.execute(context, config, [OUTPUT_PORT])

    expect(context.payload).toEqual({ existing: 'data', name: 'Alice', age: 30 })
  })

  it('▶️ does not modify payload when inputPayload is undefined', () => {
    const context = buildContext({ existing: 'data' })

    executor.execute(context, {}, [OUTPUT_PORT])

    expect(context.payload).toEqual({ existing: 'data' })
  })

  // ── Guard ───────────────────────────────────────────────────────

  it('💥 throws NO_OUTPUT_PORT when outputPorts is empty', () => {
    const context = buildContext()

    expect(() => executor.execute(context, {}, [])).toThrowError(NodeExecutionError)
    try { executor.execute(context, {}, []) } catch (error) {
      expect((error as NodeExecutionError).errorCode).toBe(ExecutionErrorCode.NO_OUTPUT_PORT)
    }
  })
})
