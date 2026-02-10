import { defineStore } from 'pinia'
import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import type { ExecutionLogEntry } from '../models/executionLog'
import type { NodeExecutionStateMap } from '../engine/nodeExecutionState'
import { getNodeDefinition, getAllNodeDefinitions } from '../registry/nodeRegistry'
import { canConnect, executeWorkflow } from '../engine/workflowEngine'
import { WorkNodeSerialization } from '../serialization/workNodeSerialization'

const workNodeSerialization = new WorkNodeSerialization()

// ─── State Interface ─────────────────────────────────────────────────

interface WorkflowCanvasState {
  nodes: RenderWorkNode[]
  edges: Edge[]
  selectedNodeId: string | null
  executionLog: ExecutionLogEntry[]
  isExecuting: boolean
  nodeExecutionStateMap: NodeExecutionStateMap
}

// ─── Store Definition ────────────────────────────────────────────────

export const useWorkflowCanvasStore = defineStore('workflowCanvas', {
  state: (): WorkflowCanvasState => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    executionLog: [],
    isExecuting: false,
    nodeExecutionStateMap: new Map(),
  }),

  getters: {
    selectedNode(state): RenderWorkNode | undefined {
      return state.nodes.find((node) => node.id === state.selectedNodeId)
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
    addNode(renderNode: RenderWorkNode) {
      this.nodes.push(renderNode)
    },

    removeNode(nodeId: string) {
      this.nodes = this.nodes.filter((n) => n.id !== nodeId)
      this.edges = this.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      )
      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null
      }
    },

    updateConfigOfNodeById(nodeId: string, key: string, value: unknown) {
      const node = this.nodes.find((n) => n.id === nodeId)
      if (node?.data?.workNode) {
        node.data.workNode.config[key] = value

        // If this node type has a portResolver, recompute ports from config
        const definition = getNodeDefinition(node.data.workNode.type)
        if (definition.portResolver) {
          const resolvedPortDefinition = definition.portResolver(node.data.workNode.config)
          node.data.portDefinition = resolvedPortDefinition

          // Prune edges whose sourceHandle no longer exists on this node
          const validOutputPortIds = new Set(resolvedPortDefinition.outputPorts.map((p) => p.id))
          this.edges = this.edges.filter(
            (edge) => edge.source !== nodeId || validOutputPortIds.has(edge.sourceHandle ?? 'out-0'),
          )
        }
      }
    },

    updatePositionOfNodeById(nodeId: string, position: { x: number, y: number }) {
      const node = this.nodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    },
    addEdge(edge: Edge) {
      const isValid = canConnect(
        edge.source,
        edge.sourceHandle ?? 'out-0',
        edge.target,
        this.nodes,
        this.edges,
      )
      if (isValid) {
        edge.type = 'DELETABLE'
        this.edges.push(edge)
      }
    },

    removeEdge(edgeId: string) {
      this.edges = this.edges.filter((e) => e.id !== edgeId)
    },

    setSelectedNode(nodeId: string | null) {
      this.selectedNodeId = nodeId
    },

    runWorkflow() {
      this.isExecuting = true
      this.executionLog = []
      this.nodeExecutionStateMap = new Map()
      try {
        const result = executeWorkflow(this.nodes, this.edges)
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
      return workNodeSerialization.serialise(this.nodes, this.edges)
    },

    importWorkflow(jsonString: string): void {
      try {
        const { nodes, edges } = workNodeSerialization.deserialise(jsonString)
        this.nodes = nodes
        this.edges = edges
        this.selectedNodeId = null
        this.executionLog = []
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
