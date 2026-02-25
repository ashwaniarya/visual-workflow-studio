import type { NodeExecutor } from '../nodeExecutor'
import type { WorkflowContext } from '../../workflowContext'
import type { OutputPortDefinition } from '../../../models/ports'
import {
  requirePrimaryOutputPort,
  requireTargetField,
  requireStringPayloadField,
} from '../transform/transformExecutorValidationPolicy'
import {
  NodeExecutionError,
  ExecutionErrorCode,
} from '../../errors/nodeExecutionError'
import { WORKFLOW_CONSTANTS } from '../../../config/workflowConstants'

const EXECUTOR_LABEL = 'URL Shortener executor'

function generateMockShortenedHash(sourceUrl: string, hashLength: number): string {
  const alphanumericCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let numericSeed = 0
  for (let charIndex = 0; charIndex < sourceUrl.length; charIndex++) {
    numericSeed = ((numericSeed << 5) - numericSeed + sourceUrl.charCodeAt(charIndex)) | 0
  }

  let hashResult = ''
  for (let position = 0; position < hashLength; position++) {
    numericSeed = ((numericSeed * 9301 + 49297) % 233280) | 0
    const characterIndex = Math.abs(numericSeed) % alphanumericCharacters.length
    hashResult += alphanumericCharacters[characterIndex]
  }

  return hashResult
}

export class UrlShortenerExecutor implements NodeExecutor {
  execute(
    context: WorkflowContext,
    config: Record<string, unknown>,
    outputPorts: OutputPortDefinition[],
  ): OutputPortDefinition | null {
    const selectedOutputPort = requirePrimaryOutputPort(outputPorts, EXECUTOR_LABEL)
    const targetField = requireTargetField(config, EXECUTOR_LABEL)
    const originalUrl = requireStringPayloadField(context, targetField, EXECUTOR_LABEL)

    const shortenedLength = Number(config.shortenedLength)

    if (
      !Number.isFinite(shortenedLength) ||
      shortenedLength < WORKFLOW_CONSTANTS.URL_SHORTENER_MIN_LENGTH ||
      shortenedLength > WORKFLOW_CONSTANTS.URL_SHORTENER_MAX_LENGTH
    ) {
      throw new NodeExecutionError(
        ExecutionErrorCode.INVALID_CONFIG_VALUE,
        `${EXECUTOR_LABEL} requires "shortenedLength" to be between ${WORKFLOW_CONSTANTS.URL_SHORTENER_MIN_LENGTH} and ${WORKFLOW_CONSTANTS.URL_SHORTENER_MAX_LENGTH}.`,
      )
    }

    const shortenedHash = generateMockShortenedHash(originalUrl, shortenedLength)
    context.payload[targetField] = `${WORKFLOW_CONSTANTS.URL_SHORTENER_MOCK_BASE_URL}${shortenedHash}`

    return selectedOutputPort
  }
}


