import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Edge, EdgeChange, NodeChange } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { VALID_NODE_TYPES_MAP } from '../config/workflowConstants'
import { useWorkflowGraphStore } from './workflowGraphStore'
import { useWorkflowHistoryStore } from './workflowHistoryStore'
import { useWorkflowPersistenceStore } from './workflowPersistenceStore'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { createWorkNode } from '../factory/workNodeFactory'

function createRenderNode(nodeId: string, nodeType: string): RenderWorkNode {
  const nodeDefinition = getNodeDefinition(nodeType)
  const workNode = createWorkNode(nodeId, nodeDefinition)

  return {
    id: nodeId,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: {
      workNode,
      portDefinition: nodeDefinition.portDefinition,
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

describe('workflowGraphStore selective graph updates', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps nodes and edges array identities stable on add and remove', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const initialNodesReference = workflowGraphStore.nodes
    const initialEdgesReference = workflowGraphStore.edges

    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const transformNode = createRenderNode('transform-node', VALID_NODE_TYPES_MAP.TRANSFORM)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode)
    workflowGraphStore.addNode(transformNode)
    workflowGraphStore.addNode(endNode)
    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-transform', 'start-node', 'transform-node'),
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-transform-end', 'transform-node', 'end-node'),
    )

    workflowGraphStore.removeNode('transform-node')

    expect(workflowGraphStore.nodes).toBe(initialNodesReference)
    expect(workflowGraphStore.edges).toBe(initialEdgesReference)
    expect(workflowGraphStore.nodes.map((node) => node.id)).toEqual([
      'start-node',
      'end-node',
    ])
    expect(workflowGraphStore.edges).toHaveLength(0)
    expect(workflowGraphStore.nodeById.has('transform-node')).toBe(false)
    expect(workflowGraphStore.edgeById.size).toBe(0)
  })

  it('prunes only invalid switch output edges after config update', () => {
    const workflowGraphStore = useWorkflowGraphStore()

    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const switchNode = createRenderNode('switch-node', VALID_NODE_TYPES_MAP.SWITCH)
    const caseZeroEndNode = createRenderNode('end-node-zero', VALID_NODE_TYPES_MAP.END)
    const caseOneEndNode = createRenderNode('end-node-one', VALID_NODE_TYPES_MAP.END)
    const defaultEndNode = createRenderNode('end-node-default', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode)
    workflowGraphStore.addNode(switchNode)
    workflowGraphStore.addNode(caseZeroEndNode)
    workflowGraphStore.addNode(caseOneEndNode)
    workflowGraphStore.addNode(defaultEndNode)

    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-switch', 'start-node', 'switch-node'),
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-switch-case-zero', 'switch-node', 'end-node-zero', 'case-0'),
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-switch-case-one', 'switch-node', 'end-node-one', 'case-1'),
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-switch-default', 'switch-node', 'end-node-default', 'default'),
    )

    workflowGraphStore.updateConfigOfNodeById('switch-node', 'cases', [
      { label: 'Case A', operator: '==', value: '' },
    ])

    const remainingEdgeIds = workflowGraphStore.edges.map((edge) => edge.id)
    expect(remainingEdgeIds).toContain('edge-switch-case-zero')
    expect(remainingEdgeIds).toContain('edge-switch-default')
    expect(remainingEdgeIds).not.toContain('edge-switch-case-one')
  })

  it('applies node and edge change sets with targeted mutations', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode)
    workflowGraphStore.addNode(endNode)
    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-end', 'start-node', 'end-node'),
    )

    workflowGraphStore.applyNodeChanges([
      {
        id: 'start-node',
        type: 'select',
        selected: true,
      } as NodeChange,
    ])

    workflowGraphStore.applyEdgeChanges([
      {
        id: 'edge-start-end',
        type: 'remove',
      } as EdgeChange,
    ])

    expect(workflowGraphStore.selectedNodeId).toBe('start-node')
    expect(workflowGraphStore.edges).toHaveLength(0)
  })

  it('keeps adjacency consistent for duplicate edge-id rewires through replaceGraphData', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const sourceNode = createRenderNode('source-node', VALID_NODE_TYPES_MAP.START)
    const previousTargetNode = createRenderNode('previous-target-node', VALID_NODE_TYPES_MAP.END)
    const latestTargetNode = createRenderNode('latest-target-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.replaceGraphData(
      [sourceNode, previousTargetNode, latestTargetNode],
      [
        createRenderEdge('edge-rewire', 'source-node', 'previous-target-node'),
        createRenderEdge('edge-rewire', 'source-node', 'latest-target-node'),
      ],
    )

    expect(workflowGraphStore.edges).toHaveLength(1)
    expect(workflowGraphStore.edgeById.get('edge-rewire')?.target).toBe('latest-target-node')
    expect(workflowGraphStore.adjacencyByNodeId.get('previous-target-node')?.has('edge-rewire')).toBe(false)
    expect(workflowGraphStore.adjacencyByNodeId.get('latest-target-node')?.has('edge-rewire')).toBe(true)

    workflowGraphStore.removeNode('previous-target-node')

    expect(workflowGraphStore.edgeById.has('edge-rewire')).toBe(true)
    expect(workflowGraphStore.edges).toHaveLength(1)
    expect(workflowGraphStore.edges[0]?.target).toBe('latest-target-node')
  })

  it('restores node config snapshots through undo and redo', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const transformNode = createRenderNode('transform-node', VALID_NODE_TYPES_MAP.TRANSFORM)
    workflowGraphStore.addNode(transformNode, { shouldAutosave: false })

    const workflowNodeInStore = workflowGraphStore.nodeById.get('transform-node')
    if (!workflowNodeInStore?.data?.workNode) {
      throw new Error('Expected transform node to be present in store')
    }

    const previousLabel = String(workflowNodeInStore.data.workNode.config.label ?? '')
    workflowGraphStore.updateConfigOfNodeById(
      'transform-node',
      'label',
      'Renamed Transform Node',
      { shouldAutosave: false },
    )
    expect(workflowNodeInStore.data.workNode.config.label).toBe('Renamed Transform Node')

    workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })
    expect(String(workflowNodeInStore.data.workNode.config.label ?? '')).toBe(previousLabel)

    workflowHistoryStore.redoLastUiAction({ shouldAutosave: false })
    expect(workflowNodeInStore.data.workNode.config.label).toBe('Renamed Transform Node')
  })

  it('updates node position without recording undo history', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowHistoryStore.clearUiCommandHistory()

    const hasMoveApplied = workflowGraphStore.updatePositionOfNodeById(
      'start-node',
      { x: 180, y: 260 },
      { shouldAutosave: false },
    )
    expect(hasMoveApplied).toBe(true)
    expect(workflowGraphStore.nodeById.get('start-node')?.position).toEqual({
      x: 180,
      y: 260,
    })
    expect(workflowHistoryStore.canUndoUiAction).toBe(false)
    expect(workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })).toBe(false)
  })

  it('does not push history for no-op move update', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowHistoryStore.clearUiCommandHistory()

    const hasMoveApplied = workflowGraphStore.updatePositionOfNodeById(
      'start-node',
      { x: 0, y: 0 },
      { shouldAutosave: false },
    )

    expect(hasMoveApplied).toBe(false)
    expect(workflowHistoryStore.canUndoUiAction).toBe(false)
    expect(workflowHistoryStore.undoCommandDepth).toBe(0)
  })

  it('schedules autosave when applyNodeChanges receives a position change', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowPersistenceStore = useWorkflowPersistenceStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    workflowGraphStore.addNode(startNode, { shouldAutosave: false })

    let scheduledWorkflowAutosaveCount = 0
    workflowPersistenceStore.scheduleWorkflowAutosave = () => {
      scheduledWorkflowAutosaveCount += 1
    }

    workflowGraphStore.applyNodeChanges([
      {
        id: 'start-node',
        type: 'position',
        position: { x: 220, y: 140 },
      } as NodeChange,
    ])

    expect(workflowGraphStore.nodeById.get('start-node')?.position).toEqual({
      x: 220,
      y: 140,
    })
    expect(scheduledWorkflowAutosaveCount).toBe(1)
  })

  it('does not schedule autosave for no-op position changes from applyNodeChanges', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowPersistenceStore = useWorkflowPersistenceStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    workflowGraphStore.addNode(startNode, { shouldAutosave: false })

    let scheduledWorkflowAutosaveCount = 0
    workflowPersistenceStore.scheduleWorkflowAutosave = () => {
      scheduledWorkflowAutosaveCount += 1
    }

    workflowGraphStore.applyNodeChanges([
      {
        id: 'start-node',
        type: 'position',
        position: { x: 0, y: 0 },
      } as NodeChange,
    ])

    expect(workflowGraphStore.nodeById.get('start-node')?.position).toEqual({
      x: 0,
      y: 0,
    })
    expect(scheduledWorkflowAutosaveCount).toBe(0)
  })
})
