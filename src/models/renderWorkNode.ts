import type { Node as VueFlowNode } from '@vue-flow/core'
import type { BaseWorkNode } from './baseWorkNode'
import type { PortDefinition } from './ports'

export interface RenderWorkNodeData {
  workNode: BaseWorkNode
  portDefinition: PortDefinition
}

export type RenderWorkNode = VueFlowNode<RenderWorkNodeData>
