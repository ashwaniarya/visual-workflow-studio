import type { NodeExecutor } from '../engine/executors/nodeExecutor'

export abstract class BaseWorkNode {
  id: string
  type: string
  config: Record<string, unknown>

  constructor(
    id: string,
    type: string,
    defaultConfig: Record<string, unknown>,
  ) {
    this.id = id
    this.type = type
    this.config = { ...defaultConfig }
  }

  abstract getExecutor(): NodeExecutor
}
