import { BaseWorkNode } from '../baseWorkNode'
import type { NodeExecutor } from '../../engine/executors/nodeExecutor'
import { SwitchNodeExecutor } from '../../engine/executors/switch/switchNodeExecutor'

export class SwitchWorkNode extends BaseWorkNode {
  getExecutor(): NodeExecutor {
    return new SwitchNodeExecutor()
  }
}
