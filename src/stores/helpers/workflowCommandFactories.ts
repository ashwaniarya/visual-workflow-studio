import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../../models/renderWorkNode'
import type { WorkflowCommand } from './workflowCommandHistory'

export interface NodeCanvasPosition {
  x: number
  y: number
}

export type NodeConfigSnapshot = Record<string, unknown>

interface AddNodeCommandDependencies {
  renderNode: RenderWorkNode
  applyAddNodePrimitive: (renderNode: RenderWorkNode) => boolean
  applyRemoveNodePrimitive: (nodeId: string) => boolean
}

interface RemoveNodeCommandDependencies {
  nodeId: string
  getNodeById: (nodeId: string) => RenderWorkNode | undefined
  getIncidentEdgesByNodeId: (nodeId: string) => Edge[]
  applyAddNodePrimitive: (renderNode: RenderWorkNode) => boolean
  applyRemoveNodePrimitive: (nodeId: string) => boolean
  applyAddEdgePrimitive: (edge: Edge) => boolean
}

interface AddEdgeCommandDependencies {
  edge: Edge
  applyAddEdgePrimitive: (edge: Edge) => boolean
  applyRemoveEdgePrimitive: (edgeId: string) => boolean
}

interface RemoveEdgeCommandDependencies {
  edgeId: string
  getEdgeById: (edgeId: string) => Edge | undefined
  applyAddEdgePrimitive: (edge: Edge) => boolean
  applyRemoveEdgePrimitive: (edgeId: string) => boolean
}

interface MoveNodeCommandDependencies {
  nodeId: string
  beforePosition: NodeCanvasPosition
  afterPosition: NodeCanvasPosition
  applyMoveNodePrimitive: (nodeId: string, position: NodeCanvasPosition) => boolean
}

interface UpdateNodeConfigCommandDependencies {
  nodeId: string
  fieldKey: string
  fieldValue: unknown
  getNodeConfigSnapshotByNodeId: (nodeId: string) => NodeConfigSnapshot | null
  applyNodeConfigValuePrimitive: (nodeId: string, fieldKey: string, fieldValue: unknown) => boolean
  applyNodeConfigSnapshotPrimitive: (nodeId: string, configSnapshot: NodeConfigSnapshot) => boolean
}

function deepCloneJsonCompatibleValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneRenderNode(renderNode: RenderWorkNode): RenderWorkNode {
  return deepCloneJsonCompatibleValue(renderNode)
}

function cloneEdge(edge: Edge): Edge {
  return deepCloneJsonCompatibleValue(edge)
}

export function createAddNodeCommand(
  dependencies: AddNodeCommandDependencies,
): WorkflowCommand {
  const { renderNode, applyAddNodePrimitive, applyRemoveNodePrimitive } = dependencies
  const renderNodeSnapshot = cloneRenderNode(renderNode)

  return {
    type: 'ADD_NODE',
    execute: () => applyAddNodePrimitive(cloneRenderNode(renderNodeSnapshot)),
    undo: () => applyRemoveNodePrimitive(renderNodeSnapshot.id),
    redo: () => applyAddNodePrimitive(cloneRenderNode(renderNodeSnapshot)),
  }
}

export function createRemoveNodeCommand(
  dependencies: RemoveNodeCommandDependencies,
): WorkflowCommand {
  const {
    nodeId,
    getNodeById,
    getIncidentEdgesByNodeId,
    applyAddNodePrimitive,
    applyRemoveNodePrimitive,
    applyAddEdgePrimitive,
  } = dependencies
  let removedNodeSnapshot: RenderWorkNode | null = null
  let removedIncidentEdgeSnapshots: Edge[] = []

  return {
    type: 'REMOVE_NODE',
    execute: () => {
      const existingNode = getNodeById(nodeId)
      if (!existingNode) {
        return false
      }
      removedNodeSnapshot = cloneRenderNode(existingNode)
      removedIncidentEdgeSnapshots = getIncidentEdgesByNodeId(nodeId).map(cloneEdge)
      return applyRemoveNodePrimitive(nodeId)
    },
    undo: () => {
      if (!removedNodeSnapshot) {
        return false
      }

      const hasNodeBeenRestored = applyAddNodePrimitive(cloneRenderNode(removedNodeSnapshot))
      if (!hasNodeBeenRestored) {
        return false
      }

      for (const removedEdgeSnapshot of removedIncidentEdgeSnapshots) {
        applyAddEdgePrimitive(cloneEdge(removedEdgeSnapshot))
      }
      return true
    },
    redo: () => applyRemoveNodePrimitive(nodeId),
  }
}

export function createAddEdgeCommand(
  dependencies: AddEdgeCommandDependencies,
): WorkflowCommand {
  const { edge, applyAddEdgePrimitive, applyRemoveEdgePrimitive } = dependencies
  const edgeSnapshot = cloneEdge(edge)

  return {
    type: 'ADD_EDGE',
    execute: () => applyAddEdgePrimitive(cloneEdge(edgeSnapshot)),
    undo: () => applyRemoveEdgePrimitive(edgeSnapshot.id),
    redo: () => applyAddEdgePrimitive(cloneEdge(edgeSnapshot)),
  }
}

export function createRemoveEdgeCommand(
  dependencies: RemoveEdgeCommandDependencies,
): WorkflowCommand {
  const { edgeId, getEdgeById, applyAddEdgePrimitive, applyRemoveEdgePrimitive } = dependencies
  let removedEdgeSnapshot: Edge | null = null

  return {
    type: 'REMOVE_EDGE',
    execute: () => {
      const existingEdge = getEdgeById(edgeId)
      if (!existingEdge) {
        return false
      }
      removedEdgeSnapshot = cloneEdge(existingEdge)
      return applyRemoveEdgePrimitive(edgeId)
    },
    undo: () => {
      if (!removedEdgeSnapshot) {
        return false
      }
      return applyAddEdgePrimitive(cloneEdge(removedEdgeSnapshot))
    },
    redo: () => applyRemoveEdgePrimitive(edgeId),
  }
}

export function createMoveNodeCommand(
  dependencies: MoveNodeCommandDependencies,
): WorkflowCommand {
  const { nodeId, beforePosition, afterPosition, applyMoveNodePrimitive } = dependencies
  const hasNodePositionChanged =
    beforePosition.x !== afterPosition.x || beforePosition.y !== afterPosition.y

  return {
    type: 'MOVE_NODE',
    execute: () => {
      if (!hasNodePositionChanged) {
        return false
      }
      return applyMoveNodePrimitive(nodeId, afterPosition)
    },
    undo: () => applyMoveNodePrimitive(nodeId, beforePosition),
    redo: () => applyMoveNodePrimitive(nodeId, afterPosition),
  }
}

export function createUpdateNodeConfigCommand(
  dependencies: UpdateNodeConfigCommandDependencies,
): WorkflowCommand {
  const {
    nodeId,
    fieldKey,
    fieldValue,
    getNodeConfigSnapshotByNodeId,
    applyNodeConfigValuePrimitive,
    applyNodeConfigSnapshotPrimitive,
  } = dependencies
  let beforeConfigSnapshot: NodeConfigSnapshot | null = null
  let afterConfigSnapshot: NodeConfigSnapshot | null = null

  return {
    type: 'UPDATE_NODE_CONFIG',
    execute: () => {
      const currentConfigSnapshot = getNodeConfigSnapshotByNodeId(nodeId)
      if (!currentConfigSnapshot) {
        return false
      }
      beforeConfigSnapshot = deepCloneJsonCompatibleValue(currentConfigSnapshot)

      const hasConfigBeenUpdated = applyNodeConfigValuePrimitive(nodeId, fieldKey, fieldValue)
      if (!hasConfigBeenUpdated) {
        return false
      }

      const nextConfigSnapshot = getNodeConfigSnapshotByNodeId(nodeId)
      if (!nextConfigSnapshot) {
        return false
      }
      afterConfigSnapshot = deepCloneJsonCompatibleValue(nextConfigSnapshot)
      return true
    },
    undo: () => {
      if (!beforeConfigSnapshot) {
        return false
      }
      return applyNodeConfigSnapshotPrimitive(nodeId, deepCloneJsonCompatibleValue(beforeConfigSnapshot))
    },
    redo: () => {
      if (!afterConfigSnapshot) {
        return false
      }
      return applyNodeConfigSnapshotPrimitive(nodeId, deepCloneJsonCompatibleValue(afterConfigSnapshot))
    },
  }
}
