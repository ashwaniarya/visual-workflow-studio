import { BaseWorkNode } from '../baseWorkNode'
import type { NodeExecutor } from '../../engine/executors/nodeExecutor'
import { resolveTransformExecutor } from '../../engine/executors/transform/resolveTransformExecutor'

export class TransformWorkNode extends BaseWorkNode {
  getExecutor(): NodeExecutor {
    return resolveTransformExecutor(this.config)
  }
}
