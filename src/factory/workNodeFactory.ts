import type { BaseWorkNode } from '../models/baseWorkNode'
import type { NodeDefinition } from '../registry/nodeRegistry'
import { StartWorkNode } from '../models/nodes/startWorkNode'
import { TransformWorkNode } from '../models/nodes/transformWorkNode'
import { DecisionWorkNode } from '../models/nodes/decisionWorkNode'
import { EndWorkNode } from '../models/nodes/endWorkNode'

export function createWorkNode(id: string, definition: NodeDefinition): BaseWorkNode {
  switch (definition.type) {
    case 'START':
      return new StartWorkNode(id, definition.type, definition.defaultConfig)
    case 'TRANSFORM':
      return new TransformWorkNode(id, definition.type, definition.defaultConfig)
    case 'DECISION':
      return new DecisionWorkNode(id, definition.type, definition.defaultConfig)
    case 'END':
      return new EndWorkNode(id, definition.type, definition.defaultConfig)
    default:
      throw new Error(`Unknown node type: ${definition.type}`)
  }
}
