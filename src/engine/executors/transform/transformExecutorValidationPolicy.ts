import type { OutputPortDefinition } from '../../../models/ports'
import type { WorkflowContext } from '../../workflowContext'
import {
  ExecutionErrorCode,
  NodeExecutionError,
} from '../../errors/nodeExecutionError'

export const TRANSFORM_VALIDATION_POLICY = {
  configFieldName: {
    targetField: 'targetField',
    operand: 'operand',
  },
} as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function requirePrimaryOutputPort(
  outputPorts: OutputPortDefinition[],
  executorLabel: string,
): OutputPortDefinition {
  const primaryOutputPort = outputPorts[0]
  if (!primaryOutputPort) {
    throw new NodeExecutionError(
      ExecutionErrorCode.NO_OUTPUT_PORT,
      `${executorLabel} requires at least one output port.`,
    )
  }

  return primaryOutputPort
}

export function requireTargetField(
  config: Record<string, unknown>,
  executorLabel: string,
): string {
  const targetFieldValue =
    config[TRANSFORM_VALIDATION_POLICY.configFieldName.targetField]

  if (!isNonEmptyString(targetFieldValue)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
      `${executorLabel} requires a non-empty "targetField" in its configuration.`,
    )
  }

  return targetFieldValue
}

export function requireNumericOperand(
  config: Record<string, unknown>,
  executorLabel: string,
): number {
  const operandKey = TRANSFORM_VALIDATION_POLICY.configFieldName.operand
  if (!(operandKey in config)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
      `${executorLabel} requires an "operand" in its configuration.`,
    )
  }

  const numericOperand = Number(config[operandKey])
  if (!Number.isFinite(numericOperand)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.INVALID_CONFIG_VALUE,
      `${executorLabel} requires a finite numeric "operand".`,
    )
  }

  return numericOperand
}

export function requireStringOperand(
  config: Record<string, unknown>,
  executorLabel: string,
): string {
  const operandKey = TRANSFORM_VALIDATION_POLICY.configFieldName.operand
  if (!(operandKey in config)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_CONFIG_FIELD,
      `${executorLabel} requires an "operand" in its configuration.`,
    )
  }

  const operandValue = config[operandKey]
  if (typeof operandValue !== 'string') {
    throw new NodeExecutionError(
      ExecutionErrorCode.INVALID_CONFIG_VALUE,
      `${executorLabel} requires a string "operand".`,
    )
  }

  return operandValue
}

export function requireNumericPayloadField(
  context: WorkflowContext,
  targetField: string,
  executorLabel: string,
): number {
  if (!(targetField in context.payload)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
      `${executorLabel} requires payload field "${targetField}" to exist.`,
    )
  }

  const targetValue = context.payload[targetField]
  if (typeof targetValue !== 'number') {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
      `${executorLabel} requires payload field "${targetField}" to be a number.`,
    )
  }

  return targetValue
}

export function requireStringPayloadField(
  context: WorkflowContext,
  targetField: string,
  executorLabel: string,
): string {
  if (!(targetField in context.payload)) {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
      `${executorLabel} requires payload field "${targetField}" to exist.`,
    )
  }

  const targetValue = context.payload[targetField]
  if (typeof targetValue !== 'string') {
    throw new NodeExecutionError(
      ExecutionErrorCode.MISSING_PAYLOAD_FIELD,
      `${executorLabel} requires payload field "${targetField}" to be a string.`,
    )
  }

  return targetValue
}
