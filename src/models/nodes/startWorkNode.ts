import { BaseWorkNode } from '../baseWorkNode'
import type { NodeExecutor } from '../../engine/executors/nodeExecutor'
import { StartExecutor } from '../../engine/executors/startExecutor'

export class StartWorkNode extends BaseWorkNode {
  getExecutor(): NodeExecutor {
    return new StartExecutor()
  }
}
