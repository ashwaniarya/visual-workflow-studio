import { describe, it, expect } from 'vitest'
import { AddExecutor } from './addExecutor'
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

describe('AddExecutor', () => {
  const executor = new AddExecutor()

  it('▶️ adds operand to numeric target field', () => {
    const context = buildContext({ amount: 10 })
    const config = { targetField: 'amount', operand: 5 }

    const result = executor.execute(context, config, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload.amount).toBe(15)
  })

  it('🧪 handles negative operands as valid numeric input', () => {
    const context = buildContext({ amount: 10 })
    const config = { targetField: 'amount', operand: -3 }

    executor.execute(context, config, [OUTPUT_PORT])

    expect(context.payload.amount).toBe(7)
  })

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ amount: 10 })
    expectExecutionError(
      () => executor.execute(context, { operand: 2 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws MISSING_CONFIG_FIELD when operand is missing', () => {
    const context = buildContext({ amount: 10 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'amount' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws INVALID_CONFIG_VALUE when operand is not numeric', () => {
    const context = buildContext({ amount: 10 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'amount', operand: 'invalid' }, [OUTPUT_PORT]),
      ExecutionErrorCode.INVALID_CONFIG_VALUE,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is absent from payload', () => {
    const context = buildContext({})
    expectExecutionError(
      () => executor.execute(context, { targetField: 'amount', operand: 1 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is not numeric', () => {
    const context = buildContext({ amount: 'ten' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'amount', operand: 1 }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ amount: 10 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'amount', operand: 1 }, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
