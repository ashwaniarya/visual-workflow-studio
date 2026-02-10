import type { Node as VueFlowNode } from '@vue-flow/core'
import type { BaseWorkNode } from './baseWorkNode'

interface RenderWorkNodeData {
  workNode: BaseWorkNode,
}

export type RenderWorkNode = VueFlowNode<RenderWorkNodeData>
