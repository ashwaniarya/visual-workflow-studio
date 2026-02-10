import { describe, it, expect } from 'vitest'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { executeWorkflow, buildWorkflow } from './workflowEngine'
import { ExecutionErrorCode } from './errors/nodeExecutionError'
import { StartWorkNode } from '../models/nodes/startWorkNode'
import { SwitchWorkNode } from '../models/nodes/switchWorkNode'
import { EndWorkNode } from '../models/nodes/endWorkNode'

// ─── Helpers ────────────────────────────────────────────────────────

// The nodeRegistry import has side-effects (auto-registers all node types)
// so getNodeDefinition() works for START, SWITCH, END etc.
import '../registry/nodeRegistry'

function makeStartNode(id: string, inputPayload: Record<string, unknown> = {}): RenderWorkNode {
  const workNode = new StartWorkNode(id, 'START', { inputPayload })
  return {
    id,
    type: 'START',
    position: { x: 0, y: 0 },
    data: {
      workNode,
      portDefinition: {
        inputCount: 0,
        outputPorts: [{ id: 'out-0', label: 'Output' }],
      },
    },
  }
}

function makeSwitchNode(
  id: string,
  config: Record<string, unknown>,
  caseCount: number,
): RenderWorkNode {
  const workNode = new SwitchWorkNode(id, 'SWITCH', config)
  const outputPorts = Array.from({ length: caseCount }, (_, index) => ({
    id: `case-${index}`,
    label: `Case ${index}`,
  }))
  outputPorts.push({ id: 'default', label: 'Default' })
  return {
    id,
    type: 'SWITCH',
    position: { x: 200, y: 0 },
    data: {
      workNode,
      portDefinition: { inputCount: 1, outputPorts },
    },
  }
}

function makeEndNode(id: string): RenderWorkNode {
  const workNode = new EndWorkNode(id, 'END', {})
  return {
    id,
    type: 'END',
    position: { x: 400, y: 0 },
    data: {
      workNode,
      portDefinition: { inputCount: 1, outputPorts: [] },
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
      makeSwitchNode('sw1', switchConfig, 1),
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
      makeSwitchNode('sw1', switchConfig, 1),
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

  // ── Happy path through Switch ────────────────────────────────────

  it('✅ traverses Switch default path and reaches End', () => {
    const switchConfig = {
      targetField: 'status',
      cases: [{ label: 'Active', operator: '==', value: 'active' }],
    }
    const nodes = [
      makeStartNode('s1', { status: 'unknown' }),
      makeSwitchNode('sw1', switchConfig, 1),
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
