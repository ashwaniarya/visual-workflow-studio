import type { PortDefinition } from '../models/ports'
import type { ConfigFieldDefinition } from '../models/configSchema'
import type { NodeExecutor } from '../engine/executors/nodeExecutor'
import { StartExecutor } from '../engine/executors/startExecutor'
import { EndExecutor } from '../engine/executors/endExecutor'
import { resolveTransformExecutor } from '../engine/executors/transform/resolveTransformExecutor'
import { DropdownDecisionExecutor } from '../engine/executors/decision/dropdownDecisionExecutor'
import { SwitchNodeExecutor } from '../engine/executors/switch/switchNodeExecutor'
import { SUPPORTED_OPERATORS } from '../engine/executors/conditionEvaluator'

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
  portResolver?: (config: Record<string, unknown>) => PortDefinition
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
  type: 'IFELSE',
  label: 'If / Else',
  category: 'control',
  icon: '🔀',
  portDefinition: {
    inputCount: 1,
    outputPorts: [
      { id: 'true-branch', label: 'True', color: '#22c55e' },
      { id: 'false-branch', label: 'False', color: '#ef4444' },
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

// ─── SWITCH: config-reactive ports via portResolver ──────────────────

const SWITCH_DEFAULT_CASES = [
  { label: 'Case A', operator: '==', value: '' },
  { label: 'Case B', operator: '==', value: '' },
]

const SWITCH_PORT_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#e879f9', '#fb923c',
]

function resolveSwitchPorts(config: Record<string, unknown>): PortDefinition {
  const cases = (config.cases as Array<{ label: string }>) ?? []
  const outputPorts: PortDefinition['outputPorts'] = cases.map((c, index) => ({
    id: `case-${index}`,
    label: c.label || `Case ${index + 1}`,
    color: SWITCH_PORT_PALETTE[index % SWITCH_PORT_PALETTE.length],
  }))
  // Always append a "Default" fallback port
  outputPorts.push({ id: 'default', label: 'Default', color: '#6b7280' })
  return { inputCount: 1, outputPorts }
}

registerNode({
  type: 'SWITCH',
  label: 'Switch',
  category: 'control',
  icon: '🔀',
  portDefinition: resolveSwitchPorts({ cases: SWITCH_DEFAULT_CASES }),
  defaultConfig: {
    targetField: '',
    cases: structuredClone(SWITCH_DEFAULT_CASES),
  },
  configSchema: [
    {
      key: 'targetField',
      label: 'Target Field',
      fieldType: 'text',
      placeholder: 'e.g. status',
    },
    {
      key: 'cases',
      label: 'Cases',
      fieldType: 'array',
      itemFields: [
        { key: 'label',    label: 'Label',    fieldType: 'text',   placeholder: 'Case name' },
        { key: 'operator', label: 'Operator', fieldType: 'select', options: [...SUPPORTED_OPERATORS] },
        { key: 'value',    label: 'Value',    fieldType: 'text',   placeholder: 'Compare value' },
      ],
    },
  ],
  portResolver: resolveSwitchPorts,
  executorResolver: () => new SwitchNodeExecutor(),
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
