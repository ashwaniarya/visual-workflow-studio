import { describe, it, expect } from 'vitest'
import { PrependExecutor } from './prependExecutor'
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

describe('PrependExecutor', () => {
  const executor = new PrependExecutor()

  it('▶️ prepends operand to string field', () => {
    const context = buildContext({ name: 'Stark' })
    const config = { targetField: 'name', operand: 'Arya ' }

    const result = executor.execute(context, config, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload.name).toBe('Arya Stark')
  })

  it('🧪 allows empty string operand as a valid prepend value', () => {
    const context = buildContext({ name: 'Stark' })

    executor.execute(context, { targetField: 'name', operand: '' }, [OUTPUT_PORT])

    expect(context.payload.name).toBe('Stark')
  })

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ name: 'Stark' })
    expectExecutionError(
      () => executor.execute(context, { operand: 'Arya ' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws MISSING_CONFIG_FIELD when operand is missing', () => {
    const context = buildContext({ name: 'Stark' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'name' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws INVALID_CONFIG_VALUE when operand is not a string', () => {
    const context = buildContext({ name: 'Stark' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'name', operand: true }, [OUTPUT_PORT]),
      ExecutionErrorCode.INVALID_CONFIG_VALUE,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is absent from payload', () => {
    const context = buildContext({})
    expectExecutionError(
      () => executor.execute(context, { targetField: 'name', operand: 'Arya ' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is not a string', () => {
    const context = buildContext({ name: 999 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'name', operand: 'Arya ' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ name: 'Stark' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'name', operand: 'Arya ' }, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
