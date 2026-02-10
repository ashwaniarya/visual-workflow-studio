import type { PortDefinition } from '../models/ports'
import type { ConfigFieldDefinition } from '../models/configSchema'
import type { NodeExecutor } from '../engine/executors/nodeExecutor'
import { StartExecutor } from '../engine/executors/startExecutor'
import { EndExecutor } from '../engine/executors/endExecutor'
import { resolveTransformExecutor } from '../engine/executors/transform/resolveTransformExecutor'
import { DropdownDecisionExecutor } from '../engine/executors/decision/dropdownDecisionExecutor'

// ─── Node Definition Interface ───────────────────────────────────────

export interface NodeDefinition {
  type: string
  label: string
  category: 'trigger' | 'processor' | 'control' | 'terminal'
  icon: string
  portDefinition: PortDefinition
  defaultConfig: Record<string, unknown>
  configSchema: ConfigFieldDefinition[]
  executorResolver: (config: Record<string, unknown>) => NodeExecutor
}

// ─── Registry Store ──────────────────────────────────────────────────

const NODE_REGISTRY: Map<string, NodeDefinition> = new Map()

export function registerNode(definition: NodeDefinition): void {
  NODE_REGISTRY.set(definition.type, definition)
}

export function getNodeDefinition(type: string): NodeDefinition {
  const definition = NODE_REGISTRY.get(type)
  if (!definition) {
    throw new Error(`Node definition not found for type: ${type}`)
  }
  return definition
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return Array.from(NODE_REGISTRY.values())
}

// ─── Built-in Node Registrations ─────────────────────────────────────

registerNode({
  type: 'START',
  label: 'Start',
  category: 'trigger',
  icon: '▶',
  portDefinition: {
    inputCount: 0,
    outputPorts: [{ id: 'out-0', label: 'Output' }],
  },
  defaultConfig: {
    inputPayload: { message: 'hello' },
  },
  configSchema: [
    {
      key: 'inputPayload',
      label: 'Input Payload (JSON)',
      fieldType: 'json',
      defaultValue: { message: 'hello' },
      placeholder: '{"key": "value"}',
    },
  ],
  executorResolver: () => new StartExecutor(),
})

registerNode({
  type: 'TRANSFORM',
  label: 'Transform',
  category: 'processor',
  icon: '🔄',
  portDefinition: {
    inputCount: 1,
    outputPorts: [{ id: 'out-0', label: 'Output' }],
  },
  defaultConfig: {
    mode: 'UPPERCASE',
    targetField: 'message',
    operand: '',
  },
  configSchema: [
    {
      key: 'mode',
      label: 'Mode',
      fieldType: 'select',
      options: ['UPPERCASE', 'LOWERCASE', 'APPEND', 'PREPEND', 'MULTIPLY', 'ADD', 'ROUND'],
    },
    {
      key: 'targetField',
      label: 'Target Field',
      fieldType: 'text',
      placeholder: 'e.g. message',
    },
    {
      key: 'operand',
      label: 'Value',
      fieldType: 'text',
      placeholder: 'Operand value',
      visibleWhen: { field: 'mode', in: ['APPEND', 'PREPEND', 'MULTIPLY', 'ADD'] },
    },
  ],
  executorResolver: (config) => resolveTransformExecutor(config),
})

registerNode({
  type: 'DECISION',
  label: 'Decision',
  category: 'control',
  icon: '🔀',
  portDefinition: {
    inputCount: 1,
    outputPorts: [
      { id: 'true-branch', label: 'True' },
      { id: 'false-branch', label: 'False' },
    ],
  },
  defaultConfig: {
    targetField: 'message',
    operator: '==',
    compareValue: '',
  },
  configSchema: [
    {
      key: 'targetField',
      label: 'Target Field',
      fieldType: 'text',
      placeholder: 'e.g. message',
    },
    {
      key: 'operator',
      label: 'Operator',
      fieldType: 'select',
      options: ['>', '<', '==', '!=', 'contains'],
    },
    {
      key: 'compareValue',
      label: 'Compare Value',
      fieldType: 'text',
      placeholder: 'Value to compare against',
    },
  ],
  executorResolver: () => new DropdownDecisionExecutor(),
})

registerNode({
  type: 'END',
  label: 'End',
  category: 'terminal',
  icon: '⏹',
  portDefinition: {
    inputCount: 1,
    outputPorts: [],
  },
  defaultConfig: {},
  configSchema: [],
  executorResolver: () => new EndExecutor(),
})
