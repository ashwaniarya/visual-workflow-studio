import { describe, it, expect } from 'vitest'
import { NoOpExecutor } from './noOpExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import { ExecutionErrorCode, NodeExecutionError } from '../../errors/nodeExecutionError'

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

describe('NoOpExecutor', () => {
  const executor = new NoOpExecutor()

  it('▶️ returns first output port and keeps payload unchanged', () => {
    const context: WorkflowContext = { payload: { value: 'keep' }, executionLog: [] }

    const result = executor.execute(context, { any: 'config' }, [OUTPUT_PORT])

    expect(result).toEqual(OUTPUT_PORT)
    expect(context.payload).toEqual({ value: 'keep' })
  })

  it('💥 throws NO_OUTPUT_PORT when output ports are empty', () => {
    const context: WorkflowContext = { payload: { value: 'keep' }, executionLog: [] }
    expectExecutionError(
      () => executor.execute(context, {}, []),
      ExecutionErrorCode.NO_OUTPUT_PORT,
    )
  })
})
