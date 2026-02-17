import { describe, it, expect } from 'vitest'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { executeWorkflow, buildWorkflow, canConnect } from './workflowEngine'
import { ExecutionErrorCode } from './errors/nodeExecutionError'
import { createWorkNode } from '../factory/workNodeFactory'
import { getNodeDefinition } from '../registry/nodeRegistry'

// ─── Helpers ────────────────────────────────────────────────────────

// The nodeRegistry import has side-effects (auto-registers all node types)
// so getNodeDefinition() works for START, SWITCH, END etc.
import '../registry/nodeRegistry'

function makeStartNode(id: string, inputPayload: Record<string, unknown> = {}): RenderWorkNode {
  const definition = getNodeDefinition('START')
  const workNode = createWorkNode(id, definition)
  if (Object.keys(inputPayload ?? {}).length > 0) {
    workNode.config.inputPayload = inputPayload
  }
  return {
    id,
    type: 'START',
    position: { x: 0, y: 0 },
    data: {
      workNode,
      portDefinition: definition.portDefinition,
    },
  }
}

function makeSwitchNode(id: string, config: Record<string, unknown>): RenderWorkNode {
  const definition = getNodeDefinition('SWITCH')
  const workNode = createWorkNode(id, definition)
  Object.assign(workNode.config, config)
  const portDefinition = definition.portResolver
    ? definition.portResolver(workNode.config)
    : definition.portDefinition
  return {
    id,
    type: 'SWITCH',
    position: { x: 200, y: 0 },
    data: {
      workNode,
      portDefinition,
    },
  }
}

function makeEndNode(id: string): RenderWorkNode {
  const definition = getNodeDefinition('END')
  const workNode = createWorkNode(id, definition)
  return {
    id,
    type: 'END',
    position: { x: 400, y: 0 },
    data: {
      workNode,
      portDefinition: definition.portDefinition,
    },
  }
}

function makeTransformNode(id: string, config: Record<string, unknown>): RenderWorkNode {
  const definition = getNodeDefinition('TRANSFORM')
  const workNode = createWorkNode(id, definition)
  Object.assign(workNode.config, config)
  return {
    id,
    type: 'TRANSFORM',
    position: { x: 200, y: 0 },
    data: {
      workNode,
      portDefinition: definition.portDefinition,
    },
  }
}

function makeDecisionNode(id: string, config: Record<string, unknown>): RenderWorkNode {
  const definition = getNodeDefinition('DECISION')
  const workNode = createWorkNode(id, definition)
  Object.assign(workNode.config, config)
  return {
    id,
    type: 'DECISION',
    position: { x: 200, y: 0 },
    data: {
      workNode,
      portDefinition: definition.portDefinition,
    },
  }
}

function makeEdge(source: string, sourceHandle: string, target: string): Edge {
  return {
    id: `edge-${source}-${sourceHandle}-${target}`,
    source,
    target,
    sourceHandle,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('workflowEngine — executeWorkflow', () => {

  // ── Happy path: START → END ──────────────────────────────────────

  it('✅ produces success state for all nodes in a simple START → END flow', () => {
    const nodes = [
      makeStartNode('s1', { greeting: 'hi' }),
      makeEndNode('e1'),
    ]
    const edges = [makeEdge('s1', 'out-0', 'e1')]

    const result = executeWorkflow(nodes, edges)

    // Both nodes should be success
    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')

    // Log should have 2 entries, both success
    expect(result.executionLog).toHaveLength(2)
    expect(result.executionLog[0]?.status).toBe('success')
    expect(result.executionLog[1]?.status).toBe('success')
  })

  // ── Error propagation: Switch with missing targetField ──────────

  it('🛑 stops execution and records error state when Switch node throws', () => {
    const switchConfig = {
      targetField: '', // 🚨 empty → will throw MISSING_CONFIG_FIELD
      cases: [{ label: 'A', operator: '==', value: 'x' }],
    }
    const nodes = [
      makeStartNode('s1', { status: 'active' }),
      makeSwitchNode('sw1', switchConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'sw1'),
      makeEdge('sw1', 'case-0', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    // Start succeeded, Switch errored
    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('sw1')?.status).toBe('error')

    // End never reached — not in state map
    expect(result.nodeExecutionStateMap.has('e1')).toBe(false)

    // Error details should be populated
    const switchState = result.nodeExecutionStateMap.get('sw1')
    expect(switchState?.errorCode).toBe(ExecutionErrorCode.MISSING_CONFIG_FIELD)
    expect(switchState?.errorMessage).toContain('targetField')
  })

  // ── errorCode in ExecutionLogEntry ───────────────────────────────

  it('📝 enriches log entry with errorCode when NodeExecutionError is thrown', () => {
    const switchConfig = {
      targetField: 'status',
      cases: [{ label: 'A', operator: '==', value: 'x' }],
    }
    // status field not in payload → MISSING_PAYLOAD_FIELD
    const nodes = [
      makeStartNode('s1'), // no inputPayload → empty payload
      makeSwitchNode('sw1', switchConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'sw1'),
      makeEdge('sw1', 'case-0', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)
    const switchLog = result.executionLog.find((entry) => entry.nodeId === 'sw1')

    expect(switchLog).toBeDefined()
    expect(switchLog?.status).toBe('error')
    expect(switchLog?.errorCode).toBe(ExecutionErrorCode.MISSING_PAYLOAD_FIELD)
    expect(switchLog?.errorMessage).toContain('status')
  })

  // ── Happy path through Switch (matched case) ────────────────────────

  it('traverses Switch case-0 path when case matches', () => {
    const switchConfig = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    const nodes = [
      makeStartNode('s1', { status: 'active' }),
      makeSwitchNode('sw1', switchConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'sw1'),
      makeEdge('sw1', 'case-0', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('sw1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')
    expect(result.executionLog).toHaveLength(3)

    const switchLog = result.executionLog.find((e) => e.nodeId === 'sw1')
    expect(switchLog?.selectedPortId).toBe('case-0')
  })

  // ── Happy path through Switch (default) ─────────────────────────────

  it('✅ traverses Switch default path and reaches End', () => {
    const switchConfig = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    const nodes = [
      makeStartNode('s1', { status: 'unknown' }),
      makeSwitchNode('sw1', switchConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'sw1'),
      makeEdge('sw1', 'default', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('sw1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')
    expect(result.executionLog).toHaveLength(3)
  })

  // ── Happy path through Transform ───────────────────────────────────

  it('traverses START → TRANSFORM (UPPERCASE) → END and uppercases payload', () => {
    const transformConfig = {
      mode: 'UPPERCASE',
      targetField: 'message',
      operand: '',
    }
    const nodes = [
      makeStartNode('s1', { message: 'hello' }),
      makeTransformNode('t1', transformConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 't1'),
      makeEdge('t1', 'out-0', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('t1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')
    expect(result.executionLog).toHaveLength(3)

    const endLog = result.executionLog.find((e) => e.nodeId === 'e1')
    expect(endLog?.outputPayload).toEqual({ message: 'HELLO' })
  })

  // ── Happy path through Decision (true branch) ───────────────────────

  it('traverses START → DECISION (true-branch) → END when condition matches', () => {
    const decisionConfig = {
      targetField: 'status',
      operator: '==',
      compareValue: 'active',
    }
    const nodes = [
      makeStartNode('s1', { status: 'active' }),
      makeDecisionNode('d1', decisionConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'd1'),
      makeEdge('d1', 'true-branch', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('d1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')
    expect(result.executionLog).toHaveLength(3)

    const decisionLog = result.executionLog.find((e) => e.nodeId === 'd1')
    expect(decisionLog?.selectedPortId).toBe('true-branch')
  })

  // ── Happy path through Decision (false branch) ───────────────────────

  it('traverses START → DECISION (false-branch) → END when condition does not match', () => {
    const decisionConfig = {
      targetField: 'status',
      operator: '==',
      compareValue: 'active',
    }
    const nodes = [
      makeStartNode('s1', { status: 'inactive' }),
      makeDecisionNode('d1', decisionConfig),
      makeEndNode('e1'),
    ]
    const edges = [
      makeEdge('s1', 'out-0', 'd1'),
      makeEdge('d1', 'false-branch', 'e1'),
    ]

    const result = executeWorkflow(nodes, edges)

    expect(result.nodeExecutionStateMap.get('s1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('d1')?.status).toBe('success')
    expect(result.nodeExecutionStateMap.get('e1')?.status).toBe('success')
    expect(result.executionLog).toHaveLength(3)

    const decisionLog = result.executionLog.find((e) => e.nodeId === 'd1')
    expect(decisionLog?.selectedPortId).toBe('false-branch')
  })
})

describe('workflowEngine — buildWorkflow validation', () => {

  it('💥 throws when no START node exists', () => {
    const nodes = [makeEndNode('e1')]
    const edges: Edge[] = []

    expect(() => buildWorkflow(nodes, edges)).toThrow('exactly 1 Start node')
  })

  it('💥 throws when no END node exists', () => {
    const nodes = [makeStartNode('s1')]
    const edges: Edge[] = []

    expect(() => buildWorkflow(nodes, edges)).toThrow('at least 1 End node')
  })
})

describe('workflowEngine — canConnect', () => {

  it('returns false for self-loop (source === target)', () => {
    const nodes = [makeStartNode('s1'), makeEndNode('e1')]
    const edges: Edge[] = []

    const result = canConnect('s1', 'out-0', 's1', nodes, edges)
    expect(result).toBe(false)
  })

  it('returns false when START node is target', () => {
    const nodes = [
      makeStartNode('s1'),
      makeTransformNode('t1', { mode: 'UPPERCASE', targetField: 'message', operand: '' }),
      makeEndNode('e1'),
    ]
    const edges: Edge[] = []

    const result = canConnect('t1', 'out-0', 's1', nodes, edges)
    expect(result).toBe(false)
  })

  it('returns false when END node is source', () => {
    const nodes = [makeStartNode('s1'), makeEndNode('e1')]
    const edges: Edge[] = []

    const result = canConnect('e1', 'out-0', 's1', nodes, edges)
    expect(result).toBe(false)
  })

  it('returns true for valid connection START → END', () => {
    const nodes = [makeStartNode('s1'), makeEndNode('e1')]
    const edges: Edge[] = []

    const result = canConnect('s1', 'out-0', 'e1', nodes, edges)
    expect(result).toBe(true)
  })
})
