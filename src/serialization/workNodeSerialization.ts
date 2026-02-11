import type { Edge } from '@vue-flow/core'
import type { RenderWorkNode } from '../models/renderWorkNode'
import type {
  SerializedWorkflow,
  SerializedWorkNode,
  SerializedEdge,
  SerializedViewport,
} from '../models/serialization'
import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { createWorkNode } from '../factory/workNodeFactory'
import {
  resolveCanonicalNodeType,
  validateWorkflowEnvelope,
  validateNodeShapeList,
  validateNodeConfig,
  validateEdgeShapeList,
  validateViewport,
} from './workflowValidation'

// ─── WorkNodeSerialization ───────────────────────────────────────────
// Pure data transformation class.
// Delegates validation to workflowValidation.ts.
// No UI code, no store awareness.

export class WorkNodeSerialization {
  // ── Serialise ────────────────────────────────────────────────────

  serialise(
    nodes: RenderWorkNode[],
    edges: Edge[],
    viewport?: SerializedViewport,
  ): string {
    const serializedNodes: SerializedWorkNode[] = nodes.map((renderNode) => {
      const workNode = renderNode.data?.workNode
      if (!workNode) {
        throw new Error(`Node "${renderNode.id}" has no workNode data — cannot serialise`)
      }
      return {
        id: renderNode.id,
        type: workNode.type,
        position: { x: renderNode.position.x, y: renderNode.position.y },
        config: { ...workNode.config },
      }
    })

    const serializedEdges: SerializedEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      target: edge.target,
      targetHandle: edge.targetHandle ?? null,
    }))

    const serializedWorkflow: SerializedWorkflow = {
      version: WORKFLOW_CONSTANTS.SERIALIZATION_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      nodes: serializedNodes,
      edges: serializedEdges,
      ...(viewport && { viewport }),
    }

    return JSON.stringify(serializedWorkflow, null, 2)
  }

  // ── Deserialise ──────────────────────────────────────────────────

  deserialise(jsonString: string): {
    nodes: RenderWorkNode[]
    edges: Edge[]
    viewport?: SerializedViewport
  } {
    // 1. Parse
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      throw new Error('Failed to parse JSON: file content is not valid JSON')
    }

    // 2. Validate envelope (version, arrays present)
    validateWorkflowEnvelope(parsed)

    // 3. Validate node shapes
    validateNodeShapeList(parsed.nodes)

    // 4. Validate each node config against its schema
    for (const node of parsed.nodes) {
      validateNodeConfig(node)
    }

    // 5. Validate edge shapes
    validateEdgeShapeList(parsed.edges)

    // 6. Validate viewport when present
    if (parsed.viewport !== undefined) {
      validateViewport(parsed.viewport)
    }

    // 7. Reconstruct live objects
    const reconstructedNodes: RenderWorkNode[] = parsed.nodes.map(
      (serializedNode: SerializedWorkNode) => {
        const canonicalType = resolveCanonicalNodeType(serializedNode.type)
        const definition = getNodeDefinition(canonicalType)
        const workNode = createWorkNode(serializedNode.id, definition)

        // Overlay validated config onto the freshly created node
        Object.assign(workNode.config, serializedNode.config)

        // Resolve portDefinition: use portResolver if available (dynamic ports),
        // otherwise fall back to the static registry definition
        const portDefinition = definition.portResolver
          ? definition.portResolver(workNode.config)
          : definition.portDefinition

        return {
          id: serializedNode.id,
          type: canonicalType,
          position: { ...serializedNode.position },
          data: { workNode, portDefinition },
        } as RenderWorkNode
      },
    )

    const reconstructedEdges: Edge[] = parsed.edges.map(
      (serializedEdge: SerializedEdge) => ({
        id: serializedEdge.id,
        source: serializedEdge.source,
        sourceHandle: serializedEdge.sourceHandle,
        target: serializedEdge.target,
        targetHandle: serializedEdge.targetHandle,
      }),
    )

    const viewport = parsed.viewport as SerializedViewport | undefined
    return { nodes: reconstructedNodes, edges: reconstructedEdges, viewport }
  }
}
