// ─── Serialized Shape Interfaces ─────────────────────────────────────
// These define the JSON contract for workflow export/import.
// Intentionally separated from internal RenderWorkNode / Vue Flow Edge types.

export interface SerializedWorkNode {
  id: string
  type: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

export interface SerializedViewport {
  x: number
  y: number
  zoom: number
}

export interface SerializedWorkflow {
  version: string
  exportedAt: string
  nodes: SerializedWorkNode[]
  edges: SerializedEdge[]
  viewport?: SerializedViewport
}
