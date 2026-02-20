import { describe, expect, it } from 'vitest'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../../models/renderWorkNode'
import { VALID_NODE_TYPES_MAP } from '../../config/workflowConstants'
import {
  addEdgeToAdjacencyIndex,
  assertGraphStateConsistency,
  buildNormalizedGraphState,
  ensureAdjacencyBucket,
  removeEdgeFromAdjacencyIndex,
} from './graphStateHelpers'

function createRenderNode(nodeId: string): RenderWorkNode {
  return {
    id: nodeId,
    type: VALID_NODE_TYPES_MAP.START,
    position: { x: 0, y: 0 },
    data: {
      workNode: {
        id: nodeId,
        type: VALID_NODE_TYPES_MAP.START,
        config: {},
        getExecutor: () => ({ execute: () => null }),
      },
      portDefinition: {
        inputCount: 0,
        outputPorts: [{ id: 'out-0', label: 'out-0' }],
      },
    },
  } as unknown as RenderWorkNode
}

function createRenderEdge(
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
): Edge {
  return {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: 'out-0',
  }
}

describe('graphStateHelpers', () => {
  it('creates and reuses adjacency bucket for node id', () => {
    const adjacencyByNodeId = new Map<string, Set<string>>()

    const firstBucket = ensureAdjacencyBucket(adjacencyByNodeId, 'node-1')
    const secondBucket = ensureAdjacencyBucket(adjacencyByNodeId, 'node-1')

    expect(firstBucket).toBe(secondBucket)
    expect(adjacencyByNodeId.get('node-1')).toBe(firstBucket)
  })

  it('adds and removes edge ids in adjacency index for both endpoints', () => {
    const adjacencyByNodeId = new Map<string, Set<string>>()
    const edge = createRenderEdge('edge-1', 'source-node', 'target-node')

    addEdgeToAdjacencyIndex(adjacencyByNodeId, edge)
    expect(adjacencyByNodeId.get('source-node')?.has('edge-1')).toBe(true)
    expect(adjacencyByNodeId.get('target-node')?.has('edge-1')).toBe(true)

    removeEdgeFromAdjacencyIndex(adjacencyByNodeId, edge)
    expect(adjacencyByNodeId.get('source-node')?.has('edge-1')).toBe(false)
    expect(adjacencyByNodeId.get('target-node')?.has('edge-1')).toBe(false)
  })

  it('builds normalized graph state and applies edge type normalization', () => {
    const sourceNode = createRenderNode('source-node')
    const targetNode = createRenderNode('target-node')
    const edge = createRenderEdge('edge-1', 'source-node', 'target-node')

    const normalizedGraphState = buildNormalizedGraphState(
      [sourceNode, targetNode],
      [edge],
    )

    expect(normalizedGraphState.nodeById.get('source-node')).toBe(sourceNode)
    expect(normalizedGraphState.nodeById.get('target-node')).toBe(targetNode)
    expect(normalizedGraphState.graphEdges).toHaveLength(1)
    expect(normalizedGraphState.graphEdges[0]?.type).toBe('DELETABLE')
    expect(normalizedGraphState.adjacencyByNodeId.get('source-node')?.has('edge-1')).toBe(true)
    expect(normalizedGraphState.adjacencyByNodeId.get('target-node')?.has('edge-1')).toBe(true)
  })

  it('creates adjacency buckets for disconnected nodes during normalization', () => {
    const disconnectedNode = createRenderNode('disconnected-node')

    const normalizedGraphState = buildNormalizedGraphState([disconnectedNode], [])

    expect(normalizedGraphState.adjacencyByNodeId.has('disconnected-node')).toBe(true)
    expect(normalizedGraphState.adjacencyByNodeId.get('disconnected-node')?.size).toBe(0)
  })

  it('keeps latest edge definition when duplicate edge ids are provided', () => {
    const sourceNode = createRenderNode('source-node')
    const middleNode = createRenderNode('middle-node')
    const targetNode = createRenderNode('target-node')
    const firstEdgeDefinition = createRenderEdge('edge-shared', 'source-node', 'middle-node')
    const latestEdgeDefinition = createRenderEdge('edge-shared', 'source-node', 'target-node')

    const normalizedGraphState = buildNormalizedGraphState(
      [sourceNode, middleNode, targetNode],
      [firstEdgeDefinition, latestEdgeDefinition],
    )

    expect(normalizedGraphState.graphEdges).toHaveLength(1)
    expect(normalizedGraphState.edgeById.get('edge-shared')?.target).toBe('target-node')
    expect(normalizedGraphState.adjacencyByNodeId.get('middle-node')?.has('edge-shared')).toBe(false)
    expect(normalizedGraphState.adjacencyByNodeId.get('target-node')?.has('edge-shared')).toBe(true)
  })

  it('validates graph state consistency and throws on adjacency mismatch', () => {
    const sourceNode = createRenderNode('source-node')
    const targetNode = createRenderNode('target-node')
    const edge = { ...createRenderEdge('edge-1', 'source-node', 'target-node'), type: 'DELETABLE' }

    const graphNodes = [sourceNode, targetNode]
    const graphEdges = [edge]
    const nodeById = new Map<string, RenderWorkNode>([
      ['source-node', sourceNode],
      ['target-node', targetNode],
    ])
    const edgeById = new Map<string, Edge>([['edge-1', edge]])
    const adjacencyByNodeId = new Map<string, Set<string>>([
      ['source-node', new Set<string>(['edge-1'])],
      ['target-node', new Set<string>()],
    ])

    expect(() => {
      assertGraphStateConsistency(
        graphNodes,
        graphEdges,
        nodeById,
        edgeById,
        adjacencyByNodeId,
      )
    }).toThrowError('Graph consistency violation: adjacency is missing edge edge-1.')
  })

  it('throws when adjacency references a missing edge id', () => {
    const sourceNode = createRenderNode('source-node')
    const targetNode = createRenderNode('target-node')

    const graphNodes = [sourceNode, targetNode]
    const graphEdges: Edge[] = []
    const nodeById = new Map<string, RenderWorkNode>([
      ['source-node', sourceNode],
      ['target-node', targetNode],
    ])
    const edgeById = new Map<string, Edge>()
    const adjacencyByNodeId = new Map<string, Set<string>>([
      ['source-node', new Set<string>(['stale-edge-id'])],
      ['target-node', new Set<string>()],
    ])

    expect(() => {
      assertGraphStateConsistency(
        graphNodes,
        graphEdges,
        nodeById,
        edgeById,
        adjacencyByNodeId,
      )
    }).toThrowError('Graph consistency violation: adjacency references missing edge stale-edge-id.')
  })

  it('throws when adjacency contains edge id under unrelated endpoint node', () => {
    const sourceNode = createRenderNode('source-node')
    const targetNode = createRenderNode('target-node')
    const unrelatedNode = createRenderNode('unrelated-node')
    const edge = { ...createRenderEdge('edge-1', 'source-node', 'target-node'), type: 'DELETABLE' }

    const graphNodes = [sourceNode, targetNode, unrelatedNode]
    const graphEdges = [edge]
    const nodeById = new Map<string, RenderWorkNode>([
      ['source-node', sourceNode],
      ['target-node', targetNode],
      ['unrelated-node', unrelatedNode],
    ])
    const edgeById = new Map<string, Edge>([['edge-1', edge]])
    const adjacencyByNodeId = new Map<string, Set<string>>([
      ['source-node', new Set<string>(['edge-1'])],
      ['target-node', new Set<string>(['edge-1'])],
      ['unrelated-node', new Set<string>(['edge-1'])],
    ])

    expect(() => {
      assertGraphStateConsistency(
        graphNodes,
        graphEdges,
        nodeById,
        edgeById,
        adjacencyByNodeId,
      )
    }).toThrowError('Graph consistency violation: adjacency has incorrect endpoint for edge edge-1.')
  })

  it('throws when graph edge array and edge map are out of sync', () => {
    const sourceNode = createRenderNode('source-node')
    const targetNode = createRenderNode('target-node')
    const edge = { ...createRenderEdge('edge-1', 'source-node', 'target-node'), type: 'DELETABLE' }

    const graphNodes = [sourceNode, targetNode]
    const graphEdges = [edge]
    const nodeById = new Map<string, RenderWorkNode>([
      ['source-node', sourceNode],
      ['target-node', targetNode],
    ])
    const edgeById = new Map<string, Edge>()
    const adjacencyByNodeId = new Map<string, Set<string>>([
      ['source-node', new Set<string>(['edge-1'])],
      ['target-node', new Set<string>(['edge-1'])],
    ])

    expect(() => {
      assertGraphStateConsistency(
        graphNodes,
        graphEdges,
        nodeById,
        edgeById,
        adjacencyByNodeId,
      )
    }).toThrowError('Graph consistency violation: graphEdges and edgeById are out of sync.')
  })
})
