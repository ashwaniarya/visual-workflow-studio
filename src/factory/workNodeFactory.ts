import type { BaseWorkNode } from '../models/baseWorkNode'
import type { NodeDefinition } from '../registry/nodeRegistry'
import type { NodeExecutor } from '../engine/executors/nodeExecutor'

class RegistryResolvedWorkNode {
  readonly id: string
  readonly type: string
  readonly config: Record<string, unknown>
  private readonly nodeDefinition: NodeDefinition

  constructor(id: string, nodeDefinition: NodeDefinition) {
    this.id = id
    this.type = nodeDefinition.type
    this.config = { ...nodeDefinition.defaultConfig }
    this.nodeDefinition = nodeDefinition
  }

  getExecutor(): NodeExecutor {
    return this.nodeDefinition.executorResolver(this.config)
  }
}

export function createWorkNode(id: string, definition: NodeDefinition): BaseWorkNode {
  return new RegistryResolvedWorkNode(id, definition)
}
