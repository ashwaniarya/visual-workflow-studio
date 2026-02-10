import { describe, it, expect } from 'vitest'
import { resolveTransformExecutor } from './resolveTransformExecutor'
import { UppercaseExecutor } from './uppercaseExecutor'
import { LowercaseExecutor } from './lowercaseExecutor'
import { AppendExecutor } from './appendExecutor'
import { PrependExecutor } from './prependExecutor'
import { MultiplyExecutor } from './multiplyExecutor'
import { AddExecutor } from './addExecutor'
import { RoundExecutor } from './roundExecutor'
import { NoOpExecutor } from './noOpExecutor'

describe('resolveTransformExecutor', () => {
  it('▶️ resolves UPPERCASE mode', () => {
    expect(resolveTransformExecutor({ mode: 'UPPERCASE' })).toBeInstanceOf(UppercaseExecutor)
  })

  it('▶️ resolves LOWERCASE mode', () => {
    expect(resolveTransformExecutor({ mode: 'LOWERCASE' })).toBeInstanceOf(LowercaseExecutor)
  })

  it('▶️ resolves APPEND mode', () => {
    expect(resolveTransformExecutor({ mode: 'APPEND' })).toBeInstanceOf(AppendExecutor)
  })

  it('▶️ resolves PREPEND mode', () => {
    expect(resolveTransformExecutor({ mode: 'PREPEND' })).toBeInstanceOf(PrependExecutor)
  })

  it('▶️ resolves MULTIPLY mode', () => {
    expect(resolveTransformExecutor({ mode: 'MULTIPLY' })).toBeInstanceOf(MultiplyExecutor)
  })

  it('▶️ resolves ADD mode', () => {
    expect(resolveTransformExecutor({ mode: 'ADD' })).toBeInstanceOf(AddExecutor)
  })

  it('▶️ resolves ROUND mode', () => {
    expect(resolveTransformExecutor({ mode: 'ROUND' })).toBeInstanceOf(RoundExecutor)
  })

  it('🧯 falls back to no-op for unknown mode', () => {
    expect(resolveTransformExecutor({ mode: 'UNKNOWN_MODE' })).toBeInstanceOf(NoOpExecutor)
  })

  it('🧯 falls back to no-op for missing mode', () => {
    expect(resolveTransformExecutor({})).toBeInstanceOf(NoOpExecutor)
  })
})
