import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { useWorkflowGraphStore } from './workflowGraphStore'
import { useWorkflowHistoryStore } from './workflowHistoryStore'
import { WORKFLOW_CONSTANTS, VALID_NODE_TYPES_MAP } from '../config/workflowConstants'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { createWorkNode } from '../factory/workNodeFactory'
import { executeWorkflow } from '../engine/workflowEngine'
import { WorkNodeSerialization } from '../serialization/workNodeSerialization'

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

describe('workflowHistoryStore command behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('undoes and redoes graph add and remove commands', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)
    const edge = createRenderEdge('edge-start-end', 'start-node', 'end-node')

    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowGraphStore.addNode(endNode, { shouldAutosave: false })
    workflowGraphStore.addEdge(edge, { shouldAutosave: false })

    expect(workflowHistoryStore.canUndoUiAction).toBe(true)
    expect(workflowGraphStore.edges).toHaveLength(1)

    workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })
    expect(workflowGraphStore.edges).toHaveLength(0)

    workflowHistoryStore.redoLastUiAction({ shouldAutosave: false })
    expect(workflowGraphStore.edges).toHaveLength(1)
    expect(workflowHistoryStore.canRedoUiAction).toBe(false)
  })

  it('clears redo stack after new command is executed', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowGraphStore.addNode(endNode, { shouldAutosave: false })
    workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })
    expect(workflowHistoryStore.canRedoUiAction).toBe(true)

    workflowGraphStore.addNode(createRenderNode('third-node', 'END'), { shouldAutosave: false })
    expect(workflowHistoryStore.canRedoUiAction).toBe(false)
  })

  it('caps undo stack depth using centralized configuration', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()

    for (let commandIndex = 0; commandIndex < WORKFLOW_CONSTANTS.MAX_UNDO_REDO_HISTORY_STEPS + 5; commandIndex++) {
      workflowGraphStore.addNode(
        createRenderNode(`node-${commandIndex}`, VALID_NODE_TYPES_MAP.END),
        { shouldAutosave: false },
      )
    }

    let undoCount = 0
    while (workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })) {
      undoCount++
    }

    expect(undoCount).toBe(WORKFLOW_CONSTANTS.MAX_UNDO_REDO_HISTORY_STEPS)
  })

  it('executes successfully after adding nodes without requiring reload', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const transformNode = createRenderNode('transform-node', VALID_NODE_TYPES_MAP.TRANSFORM)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowGraphStore.addNode(transformNode, { shouldAutosave: false })
    workflowGraphStore.addNode(endNode, { shouldAutosave: false })
    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-transform', 'start-node', 'transform-node'),
      { shouldAutosave: false },
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-transform-end', 'transform-node', 'end-node'),
      { shouldAutosave: false },
    )

    const workflowExecutionResult = executeWorkflow(workflowGraphStore.nodes, workflowGraphStore.edges)
    expect(workflowExecutionResult.nodeExecutionStateMap.get('start-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('transform-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('end-node')?.status).toBe('success')
  })

  it('executes successfully after add-node undo and redo cycle', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const transformNode = createRenderNode('transform-node', VALID_NODE_TYPES_MAP.TRANSFORM)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowGraphStore.addNode(endNode, { shouldAutosave: false })
    workflowGraphStore.addEdge(createRenderEdge('edge-start-end', 'start-node', 'end-node'), {
      shouldAutosave: false,
    })

    workflowGraphStore.addNode(transformNode, { shouldAutosave: false })
    workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })
    workflowHistoryStore.redoLastUiAction({ shouldAutosave: false })

    workflowGraphStore.removeEdge('edge-start-end', { shouldAutosave: false })
    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-transform', 'start-node', 'transform-node'),
      { shouldAutosave: false },
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-transform-end', 'transform-node', 'end-node'),
      { shouldAutosave: false },
    )

    const workflowExecutionResult = executeWorkflow(workflowGraphStore.nodes, workflowGraphStore.edges)
    expect(workflowExecutionResult.nodeExecutionStateMap.get('start-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('transform-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('end-node')?.status).toBe('success')
  })

  it('keeps execution parity after export and import following undo redo', () => {
    const workflowGraphStore = useWorkflowGraphStore()
    const workflowHistoryStore = useWorkflowHistoryStore()
    const workflowSerializer = new WorkNodeSerialization()
    const startNode = createRenderNode('start-node', VALID_NODE_TYPES_MAP.START)
    const transformNode = createRenderNode('transform-node', VALID_NODE_TYPES_MAP.TRANSFORM)
    const endNode = createRenderNode('end-node', VALID_NODE_TYPES_MAP.END)

    workflowGraphStore.addNode(startNode, { shouldAutosave: false })
    workflowGraphStore.addNode(transformNode, { shouldAutosave: false })
    workflowGraphStore.addNode(endNode, { shouldAutosave: false })
    workflowGraphStore.addEdge(
      createRenderEdge('edge-start-transform', 'start-node', 'transform-node'),
      { shouldAutosave: false },
    )
    workflowGraphStore.addEdge(
      createRenderEdge('edge-transform-end', 'transform-node', 'end-node'),
      { shouldAutosave: false },
    )

    workflowHistoryStore.undoLastUiAction({ shouldAutosave: false })
    workflowHistoryStore.redoLastUiAction({ shouldAutosave: false })

    const exportedWorkflowJson = workflowSerializer.serialise(
      [...workflowGraphStore.nodes],
      [...workflowGraphStore.edges],
    )
    const importedWorkflowGraph = workflowSerializer.deserialise(exportedWorkflowJson)
    const workflowExecutionResult = executeWorkflow(
      importedWorkflowGraph.nodes,
      importedWorkflowGraph.edges,
    )

    expect(workflowExecutionResult.nodeExecutionStateMap.get('start-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('transform-node')?.status).toBe('success')
    expect(workflowExecutionResult.nodeExecutionStateMap.get('end-node')?.status).toBe('success')
  })
})
