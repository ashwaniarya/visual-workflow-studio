import { describe, it, expect } from 'vitest'
import { RoundExecutor } from './roundExecutor'
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

describe('RoundExecutor', () => {
  const executor = new RoundExecutor()

  it('▶️ rounds numeric target field', () => {
    const context = buildContext({ score: 5.7 })
    const config = { targetField: 'score' }

    const result = executor.execute(context, config, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload.score).toBe(6)
  })

  it('📉 rounds negative decimal values', () => {
    const context = buildContext({ score: -2.4 })
    const config = { targetField: 'score' }

    executor.execute(context, config, [OUTPUT_PORT])

    expect(context.payload.score).toBe(-2)
  })

  it('💥 throws MISSING_CONFIG_FIELD when targetField is missing', () => {
    const context = buildContext({ score: 1.6 })
    expectExecutionError(
      () => executor.execute(context, {}, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is absent from payload', () => {
    const context = buildContext({})
    expectExecutionError(
      () => executor.execute(context, { targetField: 'score' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws MISSING_PAYLOAD_FIELD when target field is not numeric', () => {
    const context = buildContext({ score: '5.7' })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'score' }, [OUTPUT_PORT]),
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
    )
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context = buildContext({ score: 5.7 })
    expectExecutionError(
      () => executor.execute(context, { targetField: 'score' }, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
