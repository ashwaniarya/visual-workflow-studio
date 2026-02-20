import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../../models/renderWorkNode'
import type { PortDefinition } from '../../models/ports'
import { createWorkNode } from '../../factory/workNodeFactory'
import { getNodeDefinition } from '../../registry/nodeRegistry'
import type { WorkflowCommand } from './workflowCommandHistory'

export interface NodeCanvasPosition {
  x: number
  y: number
}

export type NodeConfigSnapshot = Record<string, unknown>

interface WorkNodeSnapshot {
  id: string
  type: string
  config: NodeConfigSnapshot
}

interface RenderWorkNodeSnapshot {
  id: string
  type: string
  position: NodeCanvasPosition
  data: {
    workNode: WorkNodeSnapshot
    portDefinition: PortDefinition
  }
}

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

function snapshotRenderWorkNode(renderNode: RenderWorkNode): RenderWorkNodeSnapshot {
  const workNode = renderNode.data?.workNode
  const portDefinition = renderNode.data?.portDefinition
  if (!workNode || !portDefinition) {
    throw new Error(`Node "${renderNode.id}" is missing workNode data for history snapshot`)
  }

  const renderNodeType = typeof renderNode.type === 'string' ? renderNode.type : workNode.type

  return {
    id: renderNode.id,
    type: renderNodeType,
    position: {
      x: renderNode.position.x,
      y: renderNode.position.y,
    },
    data: {
      workNode: {
        id: workNode.id,
        type: workNode.type,
        config: deepCloneJsonCompatibleValue(workNode.config),
      },
      portDefinition: deepCloneJsonCompatibleValue(portDefinition),
    },
  }
}

function restoreRenderWorkNodeFromSnapshot(
  renderWorkNodeSnapshot: RenderWorkNodeSnapshot,
): RenderWorkNode {
  const nodeDefinition = getNodeDefinition(renderWorkNodeSnapshot.data.workNode.type)
  const rehydratedWorkNode = createWorkNode(renderWorkNodeSnapshot.data.workNode.id, nodeDefinition)
  rehydratedWorkNode.config = deepCloneJsonCompatibleValue(renderWorkNodeSnapshot.data.workNode.config)

  const livePortDefinition = nodeDefinition.portResolver
    ? nodeDefinition.portResolver(rehydratedWorkNode.config)
    : deepCloneJsonCompatibleValue(renderWorkNodeSnapshot.data.portDefinition)

  return {
    id: renderWorkNodeSnapshot.id,
    type: renderWorkNodeSnapshot.type,
    position: {
      x: renderWorkNodeSnapshot.position.x,
      y: renderWorkNodeSnapshot.position.y,
    },
    data: {
      workNode: rehydratedWorkNode,
      portDefinition: livePortDefinition,
    },
  } as RenderWorkNode
}

function cloneEdge(edge: Edge): Edge {
  return deepCloneJsonCompatibleValue(edge)
}

export function createAddNodeCommand(
  dependencies: AddNodeCommandDependencies,
): WorkflowCommand {
  const { renderNode, applyAddNodePrimitive, applyRemoveNodePrimitive } = dependencies
  const renderNodeSnapshot = snapshotRenderWorkNode(renderNode)

  return {
    type: 'ADD_NODE',
    execute: () => applyAddNodePrimitive(restoreRenderWorkNodeFromSnapshot(renderNodeSnapshot)),
    undo: () => applyRemoveNodePrimitive(renderNodeSnapshot.id),
    redo: () => applyAddNodePrimitive(restoreRenderWorkNodeFromSnapshot(renderNodeSnapshot)),
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

  const nodeToRemove = getNodeById(nodeId)
  const removedNodeSnapshot = nodeToRemove ? snapshotRenderWorkNode(nodeToRemove) : null
  const removedIncidentEdgeSnapshots = nodeToRemove
    ? getIncidentEdgesByNodeId(nodeId).map(cloneEdge)
    : []

  return {
    type: 'REMOVE_NODE',
    execute: () => {
      if (!removedNodeSnapshot) {
        return false
      }
      return applyRemoveNodePrimitive(nodeId)
    },
    undo: () => {
      if (!removedNodeSnapshot) {
        return false
      }

      const hasNodeBeenRestored = applyAddNodePrimitive(
        restoreRenderWorkNodeFromSnapshot(removedNodeSnapshot),
      )
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
  const edgeToRemove = getEdgeById(edgeId)
  const removedEdgeSnapshot = edgeToRemove ? cloneEdge(edgeToRemove) : null

  return {
    type: 'REMOVE_EDGE',
    execute: () => {
      if (!removedEdgeSnapshot) {
        return false
      }
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
