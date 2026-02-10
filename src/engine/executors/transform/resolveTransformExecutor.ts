import type { NodeExecutor } from '../nodeExecutor'
import { UppercaseExecutor } from './uppercaseExecutor'
import { LowercaseExecutor } from './lowercaseExecutor'
import { AppendExecutor } from './appendExecutor'
import { PrependExecutor } from './prependExecutor'
import { MultiplyExecutor } from './multiplyExecutor'
import { AddExecutor } from './addExecutor'
import { RoundExecutor } from './roundExecutor'
import { NoOpExecutor } from './noOpExecutor'

export function resolveTransformExecutor(config: Record<string, unknown>): NodeExecutor {
  switch (config.mode) {
    case 'UPPERCASE':
      return new UppercaseExecutor()
    case 'LOWERCASE':
      return new LowercaseExecutor()
    case 'APPEND':
      return new AppendExecutor()
    case 'PREPEND':
      return new PrependExecutor()
    case 'MULTIPLY':
      return new MultiplyExecutor()
    case 'ADD':
      return new AddExecutor()
    case 'ROUND':
      return new RoundExecutor()
    default:
      return new NoOpExecutor()
  }
}
