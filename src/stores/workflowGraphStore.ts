// Use case:
// - Owns graph domain state, graph invariants, and graph mutation commands.
// Safe additions:
// - Node/edge primitives, graph validation, node-selection behavior tied to graph domain.
// Avoid adding:
// - Execution runtime state, persistence internals, command stack implementation details.
import { defineStore } from 'pinia'
import type { Edge, EdgeChange, NodeChange } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import { getNodeDefinition, getAllNodeDefinitions } from '../registry/nodeRegistry'
import { canConnect } from '../engine/workflowEngine'
import {
  createAddEdgeCommand,
  createAddNodeCommand,
  createRemoveEdgeCommand,
  createRemoveNodeCommand,
  createUpdateNodeConfigCommand,
  type NodeCanvasPosition,
  type NodeConfigSnapshot,
} from './helpers/workflowCommandFactories'
import {
  addEdgeToAdjacencyIndex,
  assertGraphStateConsistency,
  buildNormalizedGraphState,
  removeEdgeFromAdjacencyIndex,
  type AdjacencyByNodeId,
} from './helpers/graphStateHelpers'
import { useWorkflowHistoryStore } from './workflowHistoryStore'
import type { WorkflowCommand } from './helpers/workflowCommandHistory'
import { useWorkflowPersistenceStore } from './workflowPersistenceStore'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'

function isJsonObjectRecord(candidateValue: unknown): candidateValue is Record<string, unknown> {
  return typeof candidateValue === 'object' && candidateValue !== null
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

interface WorkflowGraphState {
  graphNodes: RenderWorkNode[]
  graphEdges: Edge[]
  nodeById: Map<string, RenderWorkNode>
  edgeById: Map<string, Edge>
  adjacencyByNodeId: AdjacencyByNodeId
  selectedNodeId: string | null
  canvasViewport: CanvasViewport | null
}

export const useWorkflowGraphStore = defineStore('workflowGraph', {
  state: (): WorkflowGraphState => ({
    graphNodes: [],
    graphEdges: [],
    nodeById: new Map(),
    edgeById: new Map(),
    adjacencyByNodeId: new Map(),
    selectedNodeId: null,
    canvasViewport: null,
  }),

  getters: {
    nodes(state): ReadonlyArray<RenderWorkNode> {
      return state.graphNodes
    },

    edges(state): ReadonlyArray<Edge> {
      return state.graphEdges
    },

    selectedNode(state): RenderWorkNode | undefined {
      return state.graphNodes.find((node) => node.id === state.selectedNodeId)
    },

    selectedNodeDefinition() {
      const node = this.selectedNode as RenderWorkNode
      if (!node?.data?.workNode) return undefined
      return getNodeDefinition(node.data.workNode.type)
    },

    availableNodeDefinitions() {
      return getAllNodeDefinitions()
    },
  },

  actions: {
    runUiCommand(
      workflowCommand: WorkflowCommand,
      options?: { shouldAutosave?: boolean },
    ): boolean {
      const workflowHistoryStore = useWorkflowHistoryStore()
      const workflowPersistenceStore = useWorkflowPersistenceStore()
      return workflowHistoryStore.runUiCommand(workflowCommand, {
        shouldAutosave: options?.shouldAutosave,
        onAutosaveRequested: () => workflowPersistenceStore.scheduleWorkflowAutosave(),
      })
    },

    runAtomicGraphMutation(performMutation: () => void) {
      performMutation()
      this.assertGraphConsistency()
    },

    assertGraphConsistency() {
      if (import.meta.env.PROD) {
        return
      }

      assertGraphStateConsistency(
        this.graphNodes,
        this.graphEdges,
        this.nodeById,
        this.edgeById,
        this.adjacencyByNodeId,
      )
    },

    replaceGraphData(
      nodes: RenderWorkNode[],
      edges: Edge[],
      options?: { shouldAutosave?: boolean },
    ) {
      this.runAtomicGraphMutation(() => {
        const normalizedGraphState = buildNormalizedGraphState(nodes, edges)

        this.graphNodes.splice(0, this.graphNodes.length, ...normalizedGraphState.graphNodes)
        this.graphEdges.splice(0, this.graphEdges.length, ...normalizedGraphState.graphEdges)

        this.nodeById = normalizedGraphState.nodeById
        this.edgeById = normalizedGraphState.edgeById
        this.adjacencyByNodeId = normalizedGraphState.adjacencyByNodeId
      })
      const workflowHistoryStore = useWorkflowHistoryStore()
      workflowHistoryStore.clearUiCommandHistory()
      if (options?.shouldAutosave !== false) {
        const workflowPersistenceStore = useWorkflowPersistenceStore()
        workflowPersistenceStore.scheduleWorkflowAutosave()
      }
    },

    applyAddNodePrimitive(renderNode: RenderWorkNode): boolean {
      let hasNodeBeenAdded = false
      this.runAtomicGraphMutation(() => {
        if (this.nodeById.has(renderNode.id)) {
          return
        }

        this.nodeById.set(renderNode.id, renderNode)
        this.adjacencyByNodeId.set(renderNode.id, new Set<string>())
        this.graphNodes.push(renderNode)
        hasNodeBeenAdded = true
      })
      return hasNodeBeenAdded
    },

    applyRemoveNodePrimitive(nodeId: string): boolean {
      if (!this.nodeById.has(nodeId)) {
        return false
      }

      this.runAtomicGraphMutation(() => {
        const incidentEdgeIds = Array.from(this.adjacencyByNodeId.get(nodeId) ?? [])
        for (const edgeId of incidentEdgeIds) {
          this.applyRemoveEdgePrimitive(edgeId)
        }

        this.nodeById.delete(nodeId)
        this.adjacencyByNodeId.delete(nodeId)

        const nodeIndex = this.graphNodes.findIndex((node) => node.id === nodeId)
        if (nodeIndex >= 0) {
          this.graphNodes.splice(nodeIndex, 1)
        }

        if (this.selectedNodeId === nodeId) {
          this.selectedNodeId = null
        }
      })
      return true
    },

    applyNodeConfigValuePrimitive(nodeId: string, key: string, value: unknown): boolean {
      const node = this.nodeById.get(nodeId)
      if (!node?.data?.workNode) {
        return false
      }
      if (!isJsonObjectRecord(node.data.workNode.config)) {
        return false
      }
      node.data.workNode.config[key] = value

      const definition = getNodeDefinition(node.data.workNode.type)
      if (definition.portResolver) {
        const resolvedPortDefinition = definition.portResolver(node.data.workNode.config)
        node.data.portDefinition = resolvedPortDefinition

        const validOutputPortIds = new Set(resolvedPortDefinition.outputPorts.map((outputPort) => outputPort.id))
        const invalidEdgeIds = Array.from(this.adjacencyByNodeId.get(nodeId) ?? []).filter((edgeId) => {
          const edge = this.edgeById.get(edgeId)
          if (!edge || edge.source !== nodeId) {
            return false
          }

          return !validOutputPortIds.has(edge.sourceHandle ?? 'out-0')
        })

        for (const invalidEdgeId of invalidEdgeIds) {
          this.applyRemoveEdgePrimitive(invalidEdgeId)
        }
      }
      return true
    },

    applyNodeConfigSnapshotPrimitive(nodeId: string, configSnapshot: NodeConfigSnapshot): boolean {
      const node = this.nodeById.get(nodeId)
      if (!node?.data?.workNode) {
        return false
      }
      const clonedConfigSnapshot = JSON.parse(JSON.stringify(configSnapshot))
      if (!isJsonObjectRecord(clonedConfigSnapshot)) {
        return false
      }
      node.data.workNode.config = clonedConfigSnapshot
      const definition = getNodeDefinition(node.data.workNode.type)
      if (definition.portResolver) {
        const resolvedPortDefinition = definition.portResolver(node.data.workNode.config)
        node.data.portDefinition = resolvedPortDefinition
      }
      return true
    },

    getNodeConfigSnapshotByNodeId(nodeId: string): NodeConfigSnapshot | null {
      const node = this.nodeById.get(nodeId)
      if (!node?.data?.workNode) {
        return null
      }
      return JSON.parse(JSON.stringify(node.data.workNode.config))
    },

    getIncidentEdgesByNodeId(nodeId: string): Edge[] {
      return Array.from(this.adjacencyByNodeId.get(nodeId) ?? [])
        .map((edgeId) => this.edgeById.get(edgeId))
        .filter((edge): edge is Edge => Boolean(edge))
    },

    applyMoveNodePrimitive(nodeId: string, position: NodeCanvasPosition): boolean {
      const node = this.nodeById.get(nodeId)
      if (node) {
        node.position.x = position.x
        node.position.y = position.y
        return true
      }
      return false
    },

    addNode(renderNode: RenderWorkNode, options?: { shouldAutosave?: boolean }): boolean {
      const addNodeCommand = createAddNodeCommand({
        renderNode,
        applyAddNodePrimitive: (candidateRenderNode) => this.applyAddNodePrimitive(candidateRenderNode),
        applyRemoveNodePrimitive: (candidateNodeId) => this.applyRemoveNodePrimitive(candidateNodeId),
      })
      return this.runUiCommand(addNodeCommand, options)
    },

    removeNode(nodeId: string, options?: { shouldAutosave?: boolean }): boolean {
      const removeNodeCommand = createRemoveNodeCommand({
        nodeId,
        getNodeById: (candidateNodeId) => this.nodeById.get(candidateNodeId),
        getIncidentEdgesByNodeId: (candidateNodeId) => this.getIncidentEdgesByNodeId(candidateNodeId),
        applyAddNodePrimitive: (candidateRenderNode) => this.applyAddNodePrimitive(candidateRenderNode),
        applyRemoveNodePrimitive: (candidateNodeId) => this.applyRemoveNodePrimitive(candidateNodeId),
        applyAddEdgePrimitive: (candidateEdge) => this.applyAddEdgePrimitive(candidateEdge),
      })
      return this.runUiCommand(removeNodeCommand, options)
    },

    updateConfigOfNodeById(
      nodeId: string,
      key: string,
      value: unknown,
      options?: { shouldAutosave?: boolean },
    ): boolean {
      const updateNodeConfigCommand = createUpdateNodeConfigCommand({
        nodeId,
        fieldKey: key,
        fieldValue: value,
        getNodeConfigSnapshotByNodeId: (candidateNodeId) => this.getNodeConfigSnapshotByNodeId(candidateNodeId),
        applyNodeConfigValuePrimitive: (candidateNodeId, candidateFieldKey, candidateFieldValue) =>
          this.applyNodeConfigValuePrimitive(candidateNodeId, candidateFieldKey, candidateFieldValue),
        applyNodeConfigSnapshotPrimitive: (candidateNodeId, candidateConfigSnapshot) =>
          this.applyNodeConfigSnapshotPrimitive(candidateNodeId, candidateConfigSnapshot),
      })
      return this.runUiCommand(updateNodeConfigCommand, options)
    },

    updatePositionOfNodeById(
      nodeId: string,
      position: NodeCanvasPosition,
      options?: { shouldAutosave?: boolean },
    ): boolean {
      const node = this.nodeById.get(nodeId)
      if (!node) {
        return false
      }
      const hasNodePositionChanged = node.position.x !== position.x || node.position.y !== position.y
      if (!hasNodePositionChanged) {
        return false
      }
      const hasNodePositionBeenUpdated = this.applyMoveNodePrimitive(nodeId, position)
      if (hasNodePositionBeenUpdated && options?.shouldAutosave !== false) {
        const workflowPersistenceStore = useWorkflowPersistenceStore()
        workflowPersistenceStore.scheduleWorkflowAutosave()
      }
      return hasNodePositionBeenUpdated
    },

    applyNodeChanges(nodeChanges: NodeChange[]) {
      let shouldScheduleWorkflowAutosave = false

      for (const nodeChange of nodeChanges) {
        if (nodeChange.type === 'position' && nodeChange.position) {
          this.updatePositionOfNodeById(nodeChange.id, {
            x: nodeChange.position.x,
            y: nodeChange.position.y,
          })
          continue
        }

        if (nodeChange.type === 'remove') {
          const hasNodeBeenRemoved = this.removeNode(nodeChange.id, { shouldAutosave: false })
          if (hasNodeBeenRemoved) {
            shouldScheduleWorkflowAutosave = true
          }
          continue
        }

        if (nodeChange.type === 'add') {
          const hasNodeBeenAdded = this.addNode(nodeChange.item as RenderWorkNode, { shouldAutosave: false })
          if (hasNodeBeenAdded) {
            shouldScheduleWorkflowAutosave = true
          }
          continue
        }

        if (nodeChange.type === 'select') {
          if (nodeChange.selected) {
            this.setSelectedNode(nodeChange.id)
          } else if (this.selectedNodeId === nodeChange.id) {
            this.setSelectedNode(null)
          }
        }
      }

      if (shouldScheduleWorkflowAutosave) {
        const workflowPersistenceStore = useWorkflowPersistenceStore()
        workflowPersistenceStore.scheduleWorkflowAutosave()
      }
    },

    applyAddEdgePrimitive(edge: Edge): boolean {
      const isValid = canConnect(
        edge.source,
        edge.sourceHandle ?? 'out-0',
        edge.target,
        this.graphNodes,
        this.graphEdges,
      )
      if (!isValid) {
        return false
      }

      let hasEdgeBeenAdded = false
      this.runAtomicGraphMutation(() => {
        const normalizedEdge: Edge = { ...edge, type: 'DELETABLE' }
        if (this.edgeById.has(normalizedEdge.id)) {
          return
        }

        this.edgeById.set(normalizedEdge.id, normalizedEdge)
        addEdgeToAdjacencyIndex(this.adjacencyByNodeId, normalizedEdge)
        this.graphEdges.push(normalizedEdge)
        hasEdgeBeenAdded = true
      })
      return hasEdgeBeenAdded
    },

    applyRemoveEdgePrimitive(edgeId: string): boolean {
      if (!this.edgeById.has(edgeId)) {
        return false
      }

      this.runAtomicGraphMutation(() => {
        const edge = this.edgeById.get(edgeId)
        if (!edge) {
          return
        }

        removeEdgeFromAdjacencyIndex(this.adjacencyByNodeId, edge)
        this.edgeById.delete(edgeId)

        const edgeIndex = this.graphEdges.findIndex((candidateEdge) => candidateEdge.id === edgeId)
        if (edgeIndex >= 0) {
          this.graphEdges.splice(edgeIndex, 1)
        }
      })
      return true
    },

    addEdge(edge: Edge, options?: { shouldAutosave?: boolean }): boolean {
      const addEdgeCommand = createAddEdgeCommand({
        edge,
        applyAddEdgePrimitive: (candidateEdge) => this.applyAddEdgePrimitive(candidateEdge),
        applyRemoveEdgePrimitive: (candidateEdgeId) => this.applyRemoveEdgePrimitive(candidateEdgeId),
      })
      return this.runUiCommand(addEdgeCommand, options)
    },

    removeEdge(edgeId: string, options?: { shouldAutosave?: boolean }): boolean {
      const removeEdgeCommand = createRemoveEdgeCommand({
        edgeId,
        getEdgeById: (candidateEdgeId) => this.edgeById.get(candidateEdgeId),
        applyAddEdgePrimitive: (candidateEdge) => this.applyAddEdgePrimitive(candidateEdge),
        applyRemoveEdgePrimitive: (candidateEdgeId) => this.applyRemoveEdgePrimitive(candidateEdgeId),
      })
      return this.runUiCommand(removeEdgeCommand, options)
    },

    applyEdgeChanges(edgeChanges: EdgeChange[]) {
      let shouldScheduleWorkflowAutosave = false

      for (const edgeChange of edgeChanges) {
        if (edgeChange.type === 'remove') {
          const hasEdgeBeenRemoved = this.removeEdge(edgeChange.id, { shouldAutosave: false })
          if (hasEdgeBeenRemoved) {
            shouldScheduleWorkflowAutosave = true
          }
          continue
        }

        if (edgeChange.type === 'add') {
          const hasEdgeBeenAdded = this.addEdge(edgeChange.item, { shouldAutosave: false })
          if (hasEdgeBeenAdded) {
            shouldScheduleWorkflowAutosave = true
          }
          continue
        }
      }

      if (shouldScheduleWorkflowAutosave) {
        const workflowPersistenceStore = useWorkflowPersistenceStore()
        workflowPersistenceStore.scheduleWorkflowAutosave()
      }
    },

    setSelectedNode(nodeId: string | null) {
      this.selectedNodeId = nodeId
    },

    updateCanvasViewport(viewport: CanvasViewport) {
      this.canvasViewport = { ...viewport }
      if (WORKFLOW_CONSTANTS.PERSIST_CANVAS_VIEWPORT) {
        const workflowPersistenceStore = useWorkflowPersistenceStore()
        workflowPersistenceStore.scheduleWorkflowAutosave()
      }
    },

    setCanvasViewport(viewport: CanvasViewport | null) {
      this.canvasViewport = viewport ? { ...viewport } : null
    },
  },
})
