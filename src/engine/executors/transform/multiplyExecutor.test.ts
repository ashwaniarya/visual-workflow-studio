import { describe, it, expect } from 'vitest'
import { MultiplyExecutor } from './multiplyExecutor'
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

describe('MultiplyExecutor', () => {
  const executor = new MultiplyExecutor()

  it('▶️ multiplies numeric field by operand', () => {
    const context = buildContext({ price: 6 })
    const config = { targetField: 'price', operand: 3 }

    const result = executor.execute(context, config, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload.price).toBe(18)
  })

  it('🧪 allows zero as a valid multiplier', () => {
    const context = buildContext({ price: 6 })
    executor.execute(context, { targetField: 'price', operand: 0 }, [OUTPUT_PORT])

    expect(context.payload.price).toBe(0)
  })

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ price: 6 })
    expectExecutionError(
      () => executor.execute(context, { operand: 2 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws MISSING_CONFIG_FIELD when operand is missing', () => {
    const context = buildContext({ price: 6 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'price' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws INVALID_CONFIG_VALUE when operand is invalid number', () => {
    const context = buildContext({ price: 6 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'price', operand: 'xyz' }, [OUTPUT_PORT]),
      ExecutionErrorCode.INVALID_CONFIG_VALUE,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is absent from payload', () => {
    const context = buildContext({})
    expectExecutionError(
      () => executor.execute(context, { targetField: 'price', operand: 2 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is not numeric', () => {
    const context = buildContext({ price: 'six' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'price', operand: 2 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ price: 6 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'price', operand: 2 }, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
