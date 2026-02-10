import { describe, it, expect } from 'vitest'
import { EndExecutor } from './endExecutor'
import type { WorkflowContext } from '../workflowContext'

// ─── Tests ──────────────────────────────────────────────────────────

describe('EndExecutor', () => {
  const executor = new EndExecutor()

  it('⏹ returns null (terminates workflow)', () => {
    const context: WorkflowContext = { payload: { data: 42 }, executionLog: [] }

    const result = executor.execute(context, {}, [])

    expect(result).toBeNull()
  })

  it('⏹ does not modify context payload', () => {
    const context: WorkflowContext = { payload: { key: 'value' }, executionLog: [] }

    executor.execute(context, {}, [])

    expect(context.payload).toEqual({ key: 'value' })
  })
})
