import type { BaseWorkNode } from '../models/baseWorkNode'
import type { NodeExecutor } from './executors/nodeExecutor'
import { getNodeDefinition } from '../registry/nodeRegistry'

interface WorkNodeExecutionShape {
  type: string
  config: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWorkNodeExecutionShape(candidateValue: unknown): candidateValue is WorkNodeExecutionShape {
  if (!isRecord(candidateValue)) {
    return false
  }

  const candidateType = candidateValue.type
  const candidateConfig = candidateValue.config

  return typeof candidateType === 'string' && isRecord(candidateConfig)
}

export function resolveNodeExecutor(workNode: BaseWorkNode | unknown, nodeId: string): NodeExecutor {
  if (!isWorkNodeExecutionShape(workNode)) {
    throw new Error(`Node "${nodeId}" has malformed workNode payload`)
  }

  const nodeDefinition = getNodeDefinition(workNode.type)
  return nodeDefinition.executorResolver(workNode.config)
}
