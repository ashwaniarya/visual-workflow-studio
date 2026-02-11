import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import type { ExecutionLogEntry } from '../models/executionLog'
import type { WorkflowContext } from './workflowContext'
import type { OutputPortDefinition } from '../models/ports'
import type { NodeExecutor } from './executors/nodeExecutor'
import type { WorkflowExecutionResult, NodeExecutionStateMap } from './nodeExecutionState'
import { NodeExecutionError } from './errors/nodeExecutionError'
import { resolveNodeExecutor } from './nodeExecutorResolver'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'

// ─── Adjacency Types ─────────────────────────────────────────────────

export interface AdjacencyEntry {
  sourcePortId: string
  targetNodeId: string
}

export type AdjacencyMap = Map<string, AdjacencyEntry[]>

// ─── Edge Validation ─────────────────────────────────────────────────

export function canConnect(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  nodes: ReadonlyArray<RenderWorkNode>,
  edges: ReadonlyArray<Edge>,
): boolean {
  if (!WORKFLOW_CONSTANTS.EDGE_VALIDATION_ENABLED) {
    return true
  }

  // Rule 1: No self-loops
  if (sourceNodeId === targetNodeId) {
    return false
  }

  const targetNode = nodes.find((n) => n.id === targetNodeId)
  const sourceNode = nodes.find((n) => n.id === sourceNodeId)
  if (!targetNode || !sourceNode) {
    return false
  }

  const targetWorkNode = targetNode.data?.workNode
  const sourceWorkNode = sourceNode.data?.workNode
  if (!targetWorkNode || !sourceWorkNode) {
    return false
  }

  const targetDefinition = getNodeDefinition(targetWorkNode.type)
  const sourceDefinition = getNodeDefinition(sourceWorkNode.type)

  // Use live portDefinition from node data (accounts for portResolver)
  const targetPortDefinition = targetNode.data?.portDefinition ?? targetDefinition.portDefinition
  const sourcePortDefinition = sourceNode.data?.portDefinition ?? sourceDefinition.portDefinition

  // Rule 2: Target must accept inputs
  if (targetPortDefinition.inputCount <= 0) {
    return false
  }

  // Rule 3: Target input not already occupied (1 edge per input for v1)
  const existingEdgesToTarget = edges.filter((e) => e.target === targetNodeId)
  if (existingEdgesToTarget.length >= targetPortDefinition.inputCount) {
    return false
  }

  // Rule 4: StartNode cannot be a target
  if (targetWorkNode.type === 'START') {
    return false
  }

  // Rule 5: EndNode cannot be a source
  if (sourceWorkNode.type === 'END') {
    return false
  }

  // Rule 6: Source port must exist on the source node's live portDefinition
  const validSourcePorts = sourcePortDefinition.outputPorts.map((p) => p.id)
  if (!validSourcePorts.includes(sourcePortId)) {
    return false
  }

  return true
}

// ─── DAG Builder ─────────────────────────────────────────────────────

export function buildWorkflow(
  nodes: ReadonlyArray<RenderWorkNode>,
  edges: ReadonlyArray<Edge>,
): AdjacencyMap {
  const adjacency: AdjacencyMap = new Map()

  // Initialize all nodes in the adjacency map
  for (const node of nodes) {
    adjacency.set(node.id, [])
  }

  // Populate edges
  for (const edge of edges) {
    const entries = adjacency.get(edge.source)
    if (entries) {
      entries.push({
        sourcePortId: edge.sourceHandle ?? 'out-0',
        targetNodeId: edge.target,
      })
    }
  }

  // Validate: exactly 1 START node
  const startNodes = nodes.filter((n) => n.data?.workNode?.type === 'START')
  if (startNodes.length !== 1) {
    throw new Error(
      `Workflow must have exactly 1 Start node, found ${startNodes.length}`,
    )
  }

  // Validate: at least 1 END node
  const endNodes = nodes.filter((n) => n.data?.workNode?.type === 'END')
  if (endNodes.length < 1) {
    throw new Error('Workflow must have at least 1 End node')
  }

  return adjacency
}

// ─── Workflow Executor ───────────────────────────────────────────────

export function executeWorkflow(
  nodes: ReadonlyArray<RenderWorkNode>,
  edges: ReadonlyArray<Edge>,
): WorkflowExecutionResult {
  const adjacency = buildWorkflow(nodes, edges)
  const nodeExecutionStateMap: NodeExecutionStateMap = new Map()

  // Find the start node
  const startNode = nodes.find((n) => n.data?.workNode?.type === 'START')
  if (!startNode || !startNode.data?.workNode) {
    throw new Error('Start node not found')
  }

  // Initialize context
  const context: WorkflowContext = {
    payload: {},
    executionLog: [],
  }

  let currentNode: RenderWorkNode | null = startNode
  let stepCounter = 0

  // Main execution loop
  while (currentNode !== null) {
    stepCounter++

    if (stepCounter > WORKFLOW_CONSTANTS.MAX_EXECUTION_STEPS) {
      throw new Error(
        `Execution exceeded maximum steps (${WORKFLOW_CONSTANTS.MAX_EXECUTION_STEPS}). Possible infinite loop.`,
      )
    }

    const workNode: import('../models/baseWorkNode').BaseWorkNode | undefined = currentNode.data?.workNode
    if (!workNode) {
      throw new Error(`Node ${currentNode.id} has no workNode instance`)
    }

    const nodeDefinition = getNodeDefinition(workNode.type)
    const livePortDefinition = currentNode.data?.portDefinition ?? nodeDefinition.portDefinition
    const snapshotInput = structuredClone(context.payload)

    // Execute the node
    const executor: NodeExecutor = resolveNodeExecutor(workNode, currentNode.id)
    let selectedPort: OutputPortDefinition | null = null
    let executionStatus: 'success' | 'error' = 'success'
    let errorMessage: string | undefined
    let errorCode: import('./errors/nodeExecutionError').ExecutionErrorCode | undefined

    try {
      selectedPort = executor.execute(
        context,
        workNode.config,
        livePortDefinition.outputPorts,
      )
    } catch (executionError) {
      executionStatus = 'error'
      errorMessage = executionError instanceof Error
        ? executionError.message
        : String(executionError)

      if (executionError instanceof NodeExecutionError) {
        errorCode = executionError.errorCode
      }
    }

    // Record per-node execution state
    nodeExecutionStateMap.set(currentNode.id, {
      status: executionStatus,
      errorMessage,
      errorCode,
    })

    // Determine next node
    let nextNodeId: string | null = null
    if (selectedPort && executionStatus === 'success') {
      const adjacencyEntries: AdjacencyEntry[] = adjacency.get(currentNode.id) ?? []
      const matchingEntry: AdjacencyEntry | undefined = adjacencyEntries.find(
        (entry: AdjacencyEntry) => entry.sourcePortId === selectedPort!.id,
      )
      nextNodeId = matchingEntry?.targetNodeId ?? null
    }

    // Log the execution step
    const logEntry: ExecutionLogEntry = {
      stepNumber: stepCounter,
      nodeId: currentNode.id,
      nodeLabel: nodeDefinition.label,
      nodeType: workNode.type,
      inputPayload: snapshotInput,
      outputPayload: structuredClone(context.payload),
      selectedPortId: selectedPort?.id ?? null,
      nextNodeId,
      status: executionStatus,
      errorMessage,
      errorCode,
      timestamp: Date.now(),
    }
    context.executionLog.push(logEntry)

    // On error, stop execution
    if (executionStatus === 'error') {
      break
    }

    // Move to next node
    if (nextNodeId) {
      currentNode = nodes.find((n: RenderWorkNode) => n.id === nextNodeId) ?? null
    } else {
      currentNode = null
    }
  }

  return {
    executionLog: context.executionLog,
    nodeExecutionStateMap,
  }
}
