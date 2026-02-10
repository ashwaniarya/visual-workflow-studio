import { describe, it, expect } from 'vitest'
import { LowercaseExecutor } from './lowercaseExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { ExecutionErrorCode, NodeExecutionError } from '../../errors/nodeExecutionError'

function buildContext(payload: Record<string, unknown> = {}): WorkflowContext {
  return { payload, executionLog: [] }
}

const OUTPUT_PORT: OutputPortDefinition = { id: 'out-0', label: 'Output' }

function expectExecutionError(
  operation: () => void,
  expectedCode: ExecutionErrorCode,
): void {
  expect(operation).toThrowError(NodeExecutionError)
  try {
    operation()
  } catch (error) {
    expect((error as NodeExecutionError).errorCode).toBe(expectedCode)
  }
}

describe('LowercaseExecutor', () => {
  const executor = new LowercaseExecutor()

  it('▶️ converts string field to lowercase', () => {
    const context = buildContext({ city: 'KINGSLANDING' })
    const config = { targetField: 'city' }

    const result = executor.execute(context, config, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload.city).toBe('kingslanding')
  })

  it('🧪 preserves punctuation and spaces while lowercasing', () => {
    const context = buildContext({ city: 'KING-S LANDING' })
    const config = { targetField: 'city' }

    executor.execute(context, config, [OUTPUT_PORT])

    expect(context.payload.city).toBe('king-s landing')
  })

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ city: 'KINGSLANDING' })
    expectExecutionError(
      () => executor.execute(context, {}, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is absent from payload', () => {
    const context = buildContext({})
    expectExecutionError(
      () => executor.execute(context, { targetField: 'city' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is not a string', () => {
    const context = buildContext({ city: 202 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'city' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ city: 'KINGSLANDING' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'city' }, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
