import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../../models/renderWorkNode'

export type AdjacencyByNodeId = Map<string, Set<string>>

export interface NormalizedGraphState {
  graphNodes: RenderWorkNode[]
  graphEdges: Edge[]
  nodeById: Map<string, RenderWorkNode>
  edgeById: Map<string, Edge>
  adjacencyByNodeId: AdjacencyByNodeId
}

export function ensureAdjacencyBucket(
  adjacencyByNodeId: AdjacencyByNodeId,
  nodeId: string,
): Set<string> {
  const existingBucket = adjacencyByNodeId.get(nodeId)
  if (existingBucket) {
    return existingBucket
  }

  const newBucket = new Set<string>()
  adjacencyByNodeId.set(nodeId, newBucket)
  return newBucket
}

export function addEdgeToAdjacencyIndex(
  adjacencyByNodeId: AdjacencyByNodeId,
  edge: Edge,
) {
  ensureAdjacencyBucket(adjacencyByNodeId, edge.source).add(edge.id)
  ensureAdjacencyBucket(adjacencyByNodeId, edge.target).add(edge.id)
}

export function removeEdgeFromAdjacencyIndex(
  adjacencyByNodeId: AdjacencyByNodeId,
  edge: Edge,
) {
  adjacencyByNodeId.get(edge.source)?.delete(edge.id)
  adjacencyByNodeId.get(edge.target)?.delete(edge.id)
}

export function buildNormalizedGraphState(
  nodes: RenderWorkNode[],
  edges: Edge[],
): NormalizedGraphState {
  const nodeById = new Map<string, RenderWorkNode>()
  const edgeById = new Map<string, Edge>()
  const adjacencyByNodeId: AdjacencyByNodeId = new Map()

  for (const node of nodes) {
    nodeById.set(node.id, node)
    ensureAdjacencyBucket(adjacencyByNodeId, node.id)
  }

  for (const edge of edges) {
    const normalizedEdge: Edge = { ...edge, type: edge.type ?? 'DELETABLE' }
    const existingEdgeWithSameId = edgeById.get(normalizedEdge.id)
    if (existingEdgeWithSameId) {
      removeEdgeFromAdjacencyIndex(adjacencyByNodeId, existingEdgeWithSameId)
    }
    edgeById.set(normalizedEdge.id, normalizedEdge)
    addEdgeToAdjacencyIndex(adjacencyByNodeId, normalizedEdge)
  }

  return {
    graphNodes: nodes,
    graphEdges: Array.from(edgeById.values()),
    nodeById,
    edgeById,
    adjacencyByNodeId,
  }
}

export function assertGraphStateConsistency(
  graphNodes: ReadonlyArray<RenderWorkNode>,
  graphEdges: ReadonlyArray<Edge>,
  nodeById: ReadonlyMap<string, RenderWorkNode>,
  edgeById: ReadonlyMap<string, Edge>,
  adjacencyByNodeId: ReadonlyMap<string, ReadonlySet<string>>,
) {
  if (graphNodes.length !== nodeById.size) {
    throw new Error('Graph consistency violation: graphNodes and nodeById are out of sync.')
  }

  if (graphEdges.length !== edgeById.size) {
    throw new Error('Graph consistency violation: graphEdges and edgeById are out of sync.')
  }

  for (const node of graphNodes) {
    if (!nodeById.has(node.id)) {
      throw new Error(`Graph consistency violation: missing nodeById entry for node ${node.id}.`)
    }
  }

  for (const edge of graphEdges) {
    if (!edgeById.has(edge.id)) {
      throw new Error(`Graph consistency violation: missing edgeById entry for edge ${edge.id}.`)
    }

    const sourceAdjacency = adjacencyByNodeId.get(edge.source)
    const targetAdjacency = adjacencyByNodeId.get(edge.target)
    const isMissingSourceAdjacency = !sourceAdjacency?.has(edge.id)
    const isMissingTargetAdjacency = !targetAdjacency?.has(edge.id)
    if (isMissingSourceAdjacency || isMissingTargetAdjacency) {
      throw new Error(`Graph consistency violation: adjacency is missing edge ${edge.id}.`)
    }
  }

  for (const [nodeId, connectedEdgeIds] of adjacencyByNodeId.entries()) {
    for (const connectedEdgeId of connectedEdgeIds) {
      const connectedEdge = edgeById.get(connectedEdgeId)
      if (!connectedEdge) {
        throw new Error(`Graph consistency violation: adjacency references missing edge ${connectedEdgeId}.`)
      }

      const isSourceOrTargetNode =
        connectedEdge.source === nodeId || connectedEdge.target === nodeId
      if (!isSourceOrTargetNode) {
        throw new Error(
          `Graph consistency violation: adjacency has incorrect endpoint for edge ${connectedEdgeId}.`,
        )
      }
    }
  }
}
