import { BaseWorkNode } from '../baseWorkNode'
import type { NodeExecutor } from '../../engine/executors/nodeExecutor'
import { EndExecutor } from '../../engine/executors/endExecutor'

export class EndWorkNode extends BaseWorkNode {
  getExecutor(): NodeExecutor {
    return new EndExecutor()
  }
}
