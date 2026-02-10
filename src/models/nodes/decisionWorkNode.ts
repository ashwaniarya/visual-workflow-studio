import { BaseWorkNode } from '../baseWorkNode'
import type { NodeExecutor } from '../../engine/executors/nodeExecutor'
import { DropdownDecisionExecutor } from '../../engine/executors/decision/dropdownDecisionExecutor'

export class DecisionWorkNode extends BaseWorkNode {
  getExecutor(): NodeExecutor {
    return new DropdownDecisionExecutor()
  }
}
