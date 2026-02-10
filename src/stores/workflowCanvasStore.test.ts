import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Edge, NodeChange, EdgeChange } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { useWorkflowCanvasStore } from './workflowCanvasStore'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { createWorkNode } from '../factory/workNodeFactory'

function createRenderNode(nodeId: string, nodeType: string): RenderWorkNode {
  const definition = getNodeDefinition(nodeType)
  const workNode = createWorkNode(nodeId, definition)

  return {
    id: nodeId,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: {
      workNode,
      portDefinition: definition.portDefinition,
    },
  } as RenderWorkNode
}

function createRenderEdge(
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle = 'out-0',
): Edge {
  return {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle,
    type: 'DELETABLE',
  }
}

describe('workflowCanvasStore selective graph updates', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps nodes and edges array identities stable on add and remove', () => {
    const workflowCanvasStore = useWorkflowCanvasStore()
    const initialNodesReference = workflowCanvasStore.nodes
    const initialEdgesReference = workflowCanvasStore.edges

    const startNode = createRenderNode('start-node', 'START')
    const transformNode = createRenderNode('transform-node', 'TRANSFORM')
    const endNode = createRenderNode('end-node', 'END')

    workflowCanvasStore.addNode(startNode)
    workflowCanvasStore.addNode(transformNode)
    workflowCanvasStore.addNode(endNode)
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-start-transform', 'start-node', 'transform-node'),
    )
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-transform-end', 'transform-node', 'end-node'),
    )

    workflowCanvasStore.removeNode('transform-node')

    expect(workflowCanvasStore.nodes).toBe(initialNodesReference)
    expect(workflowCanvasStore.edges).toBe(initialEdgesReference)
    expect(workflowCanvasStore.nodes.map((node) => node.id)).toEqual([
      'start-node',
      'end-node',
    ])
    expect(workflowCanvasStore.edges).toHaveLength(0)
    expect(workflowCanvasStore.nodeById.has('transform-node')).toBe(false)
    expect(workflowCanvasStore.edgeById.size).toBe(0)
  })

  it('prunes only invalid switch output edges after config update', () => {
    const workflowCanvasStore = useWorkflowCanvasStore()

    const startNode = createRenderNode('start-node', 'START')
    const switchNode = createRenderNode('switch-node', 'SWITCH')
    const caseZeroEndNode = createRenderNode('end-node-zero', 'END')
    const caseOneEndNode = createRenderNode('end-node-one', 'END')
    const defaultEndNode = createRenderNode('end-node-default', 'END')

    workflowCanvasStore.addNode(startNode)
    workflowCanvasStore.addNode(switchNode)
    workflowCanvasStore.addNode(caseZeroEndNode)
    workflowCanvasStore.addNode(caseOneEndNode)
    workflowCanvasStore.addNode(defaultEndNode)

    workflowCanvasStore.addEdge(
      createRenderEdge('edge-start-switch', 'start-node', 'switch-node'),
    )
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-switch-case-zero', 'switch-node', 'end-node-zero', 'case-0'),
    )
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-switch-case-one', 'switch-node', 'end-node-one', 'case-1'),
    )
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-switch-default', 'switch-node', 'end-node-default', 'default'),
    )

    workflowCanvasStore.updateConfigOfNodeById('switch-node', 'cases', [
      { label: 'Case A', operator: '==', value: '' },
    ])

    const remainingEdgeIds = workflowCanvasStore.edges.map((edge) => edge.id)
    expect(remainingEdgeIds).toContain('edge-switch-case-zero')
    expect(remainingEdgeIds).toContain('edge-switch-default')
    expect(remainingEdgeIds).not.toContain('edge-switch-case-one')
  })

  it('applies node and edge change sets with targeted mutations', () => {
    const workflowCanvasStore = useWorkflowCanvasStore()
    const startNode = createRenderNode('start-node', 'START')
    const endNode = createRenderNode('end-node', 'END')

    workflowCanvasStore.addNode(startNode)
    workflowCanvasStore.addNode(endNode)
    workflowCanvasStore.addEdge(
      createRenderEdge('edge-start-end', 'start-node', 'end-node'),
    )

    const nodeBeforePositionChange = workflowCanvasStore.nodeById.get('start-node')

    workflowCanvasStore.applyNodeChanges([
      {
        id: 'start-node',
        type: 'position',
        position: { x: 180, y: 260 },
      } as NodeChange,
    ])
    workflowCanvasStore.applyEdgeChanges([
      {
        id: 'edge-start-end',
        type: 'remove',
      } as EdgeChange,
    ])

    const nodeAfterPositionChange = workflowCanvasStore.nodeById.get('start-node')
    expect(nodeAfterPositionChange).toBe(nodeBeforePositionChange)
    expect(nodeAfterPositionChange?.position).toEqual({ x: 180, y: 260 })
    expect(workflowCanvasStore.edges).toHaveLength(0)
  })

  it('keeps adjacency consistent for duplicate edge-id rewires through replaceGraphData', () => {
    const workflowCanvasStore = useWorkflowCanvasStore()
    const sourceNode = createRenderNode('source-node', 'START')
    const previousTargetNode = createRenderNode('previous-target-node', 'END')
    const latestTargetNode = createRenderNode('latest-target-node', 'END')

    workflowCanvasStore.replaceGraphData(
      [sourceNode, previousTargetNode, latestTargetNode],
      [
        createRenderEdge('edge-rewire', 'source-node', 'previous-target-node'),
        createRenderEdge('edge-rewire', 'source-node', 'latest-target-node'),
      ],
    )

    expect(workflowCanvasStore.edges).toHaveLength(1)
    expect(workflowCanvasStore.edgeById.get('edge-rewire')?.target).toBe('latest-target-node')
    expect(workflowCanvasStore.adjacencyByNodeId.get('previous-target-node')?.has('edge-rewire')).toBe(false)
    expect(workflowCanvasStore.adjacencyByNodeId.get('latest-target-node')?.has('edge-rewire')).toBe(true)

    workflowCanvasStore.removeNode('previous-target-node')

    expect(workflowCanvasStore.edgeById.has('edge-rewire')).toBe(true)
    expect(workflowCanvasStore.edges).toHaveLength(1)
    expect(workflowCanvasStore.edges[0]?.target).toBe('latest-target-node')
  })
})
