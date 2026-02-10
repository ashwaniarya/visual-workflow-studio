import { defineStore } from 'pinia'
import type { Edge, EdgeChange, NodeChange } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import type { ExecutionLogEntry } from '../models/executionLog'
import type { NodeExecutionStateMap } from '../engine/nodeExecutionState'
import { getNodeDefinition, getAllNodeDefinitions } from '../registry/nodeRegistry'
import { canConnect, executeWorkflow } from '../engine/workflowEngine'
import { WorkNodeSerialization } from '../serialization/workNodeSerialization'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import type { WorkflowCommand } from './helpers/workflowCommandHistory'
import { WorkflowCommandHistory } from './helpers/workflowCommandHistory'
import {
  createAddEdgeCommand,
  createAddNodeCommand,
  createMoveNodeCommand,
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

const workNodeSerialization = new WorkNodeSerialization()

// ─── State Interface ─────────────────────────────────────────────────

interface WorkflowCanvasState {
  graphNodes: RenderWorkNode[]
  graphEdges: Edge[]
  nodeById: Map<string, RenderWorkNode>
  edgeById: Map<string, Edge>
  adjacencyByNodeId: AdjacencyByNodeId
  selectedNodeId: string | null
  executionLog: ExecutionLogEntry[]
  isExecuting: boolean
  nodeExecutionStateMap: NodeExecutionStateMap
  isWorkflowAutosaveInProgress: boolean
  lastWorkflowAutosavedTimestamp: number | null
  workflowAutosaveDebounceTimerId: ReturnType<typeof setTimeout> | null
  workflowAutosaveIndicatorTimerId: ReturnType<typeof setTimeout> | null
  workflowCommandHistory: WorkflowCommandHistory
  undoCommandDepth: number
  redoCommandDepth: number
}

// ─── Store Definition ────────────────────────────────────────────────

export const useWorkflowCanvasStore = defineStore('workflowCanvas', {
  state: (): WorkflowCanvasState => ({
    graphNodes: [],
    graphEdges: [],
    nodeById: new Map(),
    edgeById: new Map(),
    adjacencyByNodeId: new Map(),
    selectedNodeId: null,
    executionLog: [],
    isExecuting: false,
    nodeExecutionStateMap: new Map(),
    isWorkflowAutosaveInProgress: false,
    lastWorkflowAutosavedTimestamp: null,
    workflowAutosaveDebounceTimerId: null,
    workflowAutosaveIndicatorTimerId: null,
    workflowCommandHistory: new WorkflowCommandHistory(
      WORKFLOW_CONSTANTS.MAX_UNDO_REDO_HISTORY_STEPS,
    ),
    undoCommandDepth: 0,
    redoCommandDepth: 0,
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

    canUndoUiAction(state): boolean {
      return state.undoCommandDepth > 0
    },

    canRedoUiAction(state): boolean {
      return state.redoCommandDepth > 0
    },
  },

  actions: {
    synchronizeCommandHistoryDepths() {
      this.undoCommandDepth = this.workflowCommandHistory.undoDepth
      this.redoCommandDepth = this.workflowCommandHistory.redoDepth
    },

    clearUiCommandHistory() {
      this.workflowCommandHistory.clear()
      this.synchronizeCommandHistoryDepths()
    },

    runUiCommand(
      workflowCommand: WorkflowCommand,
      options?: { shouldAutosave?: boolean },
    ): boolean {
      const hasCommandExecuted = this.workflowCommandHistory.runCommand(workflowCommand)
      this.synchronizeCommandHistoryDepths()
      if (hasCommandExecuted && options?.shouldAutosave !== false) {
        this.scheduleWorkflowAutosave()
      }
      return hasCommandExecuted
    },

    undoLastUiAction(options?: { shouldAutosave?: boolean }): boolean {
      const hasUndoApplied = this.workflowCommandHistory.undo()
      this.synchronizeCommandHistoryDepths()
      if (hasUndoApplied && options?.shouldAutosave !== false) {
        this.scheduleWorkflowAutosave()
      }
      return hasUndoApplied
    },

    redoLastUiAction(options?: { shouldAutosave?: boolean }): boolean {
      const hasRedoApplied = this.workflowCommandHistory.redo()
      this.synchronizeCommandHistoryDepths()
      if (hasRedoApplied && options?.shouldAutosave !== false) {
        this.scheduleWorkflowAutosave()
      }
      return hasRedoApplied
    },

    beginWorkflowAutosaveIndicator() {
      this.isWorkflowAutosaveInProgress = true

      if (this.workflowAutosaveIndicatorTimerId !== null) {
        clearTimeout(this.workflowAutosaveIndicatorTimerId)
        this.workflowAutosaveIndicatorTimerId = null
      }
    },

    finishWorkflowAutosaveIndicator() {
      if (typeof window === 'undefined') {
        this.isWorkflowAutosaveInProgress = false
        this.workflowAutosaveIndicatorTimerId = null
        return
      }

      this.workflowAutosaveIndicatorTimerId = window.setTimeout(() => {
        this.isWorkflowAutosaveInProgress = false
        this.workflowAutosaveIndicatorTimerId = null
      }, WORKFLOW_CONSTANTS.WORKFLOW_SAVE_INDICATOR_MIN_VISIBLE_MS)
    },

    scheduleWorkflowAutosave() {
      if (typeof window === 'undefined') {
        return
      }

      if (this.workflowAutosaveDebounceTimerId !== null) {
        clearTimeout(this.workflowAutosaveDebounceTimerId)
      }

      this.workflowAutosaveDebounceTimerId = window.setTimeout(() => {
        this.workflowAutosaveDebounceTimerId = null
        this.persistWorkflowSnapshotToStorage()
      }, WORKFLOW_CONSTANTS.WORKFLOW_AUTOSAVE_DEBOUNCE_MS)
    },

    persistWorkflowSnapshotToStorage() {
      if (typeof window === 'undefined') {
        return
      }

      this.beginWorkflowAutosaveIndicator()
      try {
        const workflowJsonString = this.exportWorkflow()
        window.localStorage.setItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY, workflowJsonString)
        this.lastWorkflowAutosavedTimestamp = Date.now()
      } finally {
        this.finishWorkflowAutosaveIndicator()
      }
    },

    restoreWorkflowSnapshotFromStorage(): boolean {
      if (typeof window === 'undefined') {
        return false
      }

      const workflowJsonString = window.localStorage.getItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY)
      if (!workflowJsonString) {
        return false
      }

      try {
        const { nodes, edges } = workNodeSerialization.deserialise(workflowJsonString)
        this.replaceGraphData(nodes, edges, { shouldAutosave: false })
        this.selectedNodeId = null
        this.executionLog = []
        this.nodeExecutionStateMap = new Map()
        return true
      } catch {
        window.localStorage.removeItem(WORKFLOW_CONSTANTS.WORKFLOW_STORAGE_KEY)
        return false
      }
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
      this.clearUiCommandHistory()
      if (options?.shouldAutosave !== false) {
        this.scheduleWorkflowAutosave()
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

        this.nodeExecutionStateMap.delete(nodeId)
      })
      return true
    },

    applyNodeConfigValuePrimitive(nodeId: string, key: string, value: unknown): boolean {
      const node = this.nodeById.get(nodeId)
      if (!node?.data?.workNode) {
        return false
      }
      node.data.workNode.config[key] = value

      const definition = getNodeDefinition(node.data.workNode.type)
      if (definition.portResolver) {
        const resolvedPortDefinition = definition.portResolver(node.data.workNode.config)
        node.data.portDefinition = resolvedPortDefinition

        const validOutputPortIds = new Set(resolvedPortDefinition.outputPorts.map((p) => p.id))
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
      node.data.workNode.config = JSON.parse(JSON.stringify(configSnapshot))
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

    updateConfigOfNodeById(nodeId: string, key: string, value: unknown, options?: { shouldAutosave?: boolean }): boolean {
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

    updatePositionOfNodeById(nodeId: string, position: NodeCanvasPosition, options?: { shouldAutosave?: boolean }): boolean {
      const node = this.nodeById.get(nodeId)
      if (!node) {
        return false
      }
      return this.recordNodeMoveByBoundaryPositions(
        nodeId,
        { x: node.position.x, y: node.position.y },
        position,
        options,
      )
    },

    recordNodeMoveByBoundaryPositions(
      nodeId: string,
      beforePosition: NodeCanvasPosition,
      afterPosition: NodeCanvasPosition,
      options?: { shouldAutosave?: boolean },
    ): boolean {
      if (!this.nodeById.has(nodeId)) {
        return false
      }
      const moveNodeCommand = createMoveNodeCommand({
        nodeId,
        beforePosition,
        afterPosition,
        applyMoveNodePrimitive: (candidateNodeId, candidatePosition) =>
          this.applyMoveNodePrimitive(candidateNodeId, candidatePosition),
      })
      return this.runUiCommand(moveNodeCommand, options)
    },

    applyNodeChanges(nodeChanges: NodeChange[]) {
      let shouldScheduleWorkflowAutosave = false

      for (const nodeChange of nodeChanges) {
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
        this.scheduleWorkflowAutosave()
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
        this.scheduleWorkflowAutosave()
      }
    },

    setSelectedNode(nodeId: string | null) {
      this.selectedNodeId = nodeId
    },

    runWorkflow() {
      this.isExecuting = true
      this.executionLog = []
      this.nodeExecutionStateMap = new Map()
      try {
        const result = executeWorkflow(this.graphNodes, this.graphEdges)
        this.executionLog = result.executionLog
        this.nodeExecutionStateMap = result.nodeExecutionStateMap
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.executionLog = [
          {
            stepNumber: 0,
            nodeId: 'SYSTEM',
            nodeLabel: 'System Error',
            nodeType: 'ERROR',
            inputPayload: {},
            outputPayload: {},
            selectedPortId: null,
            nextNodeId: null,
            status: 'error',
            errorMessage,
            timestamp: Date.now(),
          },
        ]
      } finally {
        this.isExecuting = false
      }
    },

    clearExecutionLog() {
      this.executionLog = []
      this.nodeExecutionStateMap = new Map()
    },

    exportWorkflow(): string {
      return workNodeSerialization.serialise(this.graphNodes, this.graphEdges)
    },

    importWorkflow(jsonString: string): void {
      try {
        const { nodes, edges } = workNodeSerialization.deserialise(jsonString)
        this.replaceGraphData(nodes, edges)
        this.selectedNodeId = null
        this.executionLog = []
        this.nodeExecutionStateMap = new Map()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.executionLog = [
          {
            stepNumber: 0,
            nodeId: 'SYSTEM',
            nodeLabel: 'Import Error',
            nodeType: 'ERROR',
            inputPayload: {},
            outputPayload: {},
            selectedPortId: null,
            nextNodeId: null,
            status: 'error',
            errorMessage,
            timestamp: Date.now(),
          },
        ]
      }
    },
  },
})
