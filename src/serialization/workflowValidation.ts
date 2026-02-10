import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import { getNodeDefinition } from '../registry/nodeRegistry'
import type {
  SerializedWorkflow,
  SerializedWorkNode,
  SerializedEdge,
} from '../models/serialization'

// ─── Envelope Validation ─────────────────────────────────────────────

export function validateWorkflowEnvelope(data: unknown): asserts data is SerializedWorkflow {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid workflow JSON: root must be a plain object')
  }

  const record = data as Record<string, unknown>

  if (typeof record.version !== 'string') {
    throw new Error('Invalid workflow JSON: missing or non-string "version" field')
  }

  if (record.version !== WORKFLOW_CONSTANTS.SERIALIZATION_FORMAT_VERSION) {
    throw new Error(
      `Version mismatch: file is v${record.version}, expected v${WORKFLOW_CONSTANTS.SERIALIZATION_FORMAT_VERSION}`,
    )
  }

  if (!Array.isArray(record.nodes)) {
    throw new Error('Invalid workflow JSON: "nodes" must be an array')
  }

  if (!Array.isArray(record.edges)) {
    throw new Error('Invalid workflow JSON: "edges" must be an array')
  }
}

// ─── Node Shape Validation ───────────────────────────────────────────

export function validateNodeShapeList(nodes: unknown[]): asserts nodes is SerializedWorkNode[] {
  const validTypes: readonly string[] = WORKFLOW_CONSTANTS.VALID_NODE_TYPES

  nodes.forEach((node, index) => {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      throw new Error(`Node at index ${index}: must be a plain object`)
    }

    const record = node as Record<string, unknown>

    // id
    if (typeof record.id !== 'string' || record.id.trim() === '') {
      throw new Error(`Node at index ${index}: "id" must be a non-empty string`)
    }

    const nodeLabel = record.id

    // type
    if (typeof record.type !== 'string' || !validTypes.includes(record.type)) {
      throw new Error(
        `Node "${nodeLabel}" at index ${index}: "type" must be one of [${validTypes.join(', ')}], got "${record.type}"`,
      )
    }

    // position
    if (
      typeof record.position !== 'object' ||
      record.position === null ||
      Array.isArray(record.position)
    ) {
      throw new Error(`Node "${nodeLabel}" at index ${index}: "position" must be an object with x and y`)
    }

    const position = record.position as Record<string, unknown>
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      throw new Error(`Node "${nodeLabel}" at index ${index}: "position.x" and "position.y" must be numbers`)
    }

    // config
    if (
      typeof record.config !== 'object' ||
      record.config === null ||
      Array.isArray(record.config)
    ) {
      throw new Error(`Node "${nodeLabel}" at index ${index}: "config" must be a plain object`)
    }
  })
}

// ─── Node Config Deep Validation ─────────────────────────────────────

const FIELD_TYPE_TO_EXPECTED_TYPEOF: Record<string, string> = {
  text: 'string',
  select: 'string',
  number: 'number',
  checkbox: 'boolean',
  json: 'object',
}

export function validateNodeConfig(node: SerializedWorkNode): void {
  const definition = getNodeDefinition(node.type)
  const schema = definition.configSchema
  const schemaKeys = new Set(schema.map((field) => field.key))

  for (const field of schema) {
    const value = node.config[field.key]

    // Self-healing: fill missing keys with defaultValue from schema
    if (value === undefined) {
      if (field.defaultValue !== undefined) {
        node.config[field.key] = field.defaultValue
      }
      // If no defaultValue either, skip validation — the field is truly optional
      continue
    }

    // Type alignment check
    const expectedType = FIELD_TYPE_TO_EXPECTED_TYPEOF[field.fieldType]
    if (expectedType) {
      const actualType = typeof value

      // json field: must be object and not null and not array
      if (field.fieldType === 'json') {
        if (actualType !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(
            `Node "${node.id}": config key "${field.key}" expected json (object) but got ${actualType === 'object' ? (value === null ? 'null' : 'array') : actualType}`,
          )
        }
      } else if (actualType !== expectedType) {
        throw new Error(
          `Node "${node.id}": config key "${field.key}" expected ${field.fieldType} (${expectedType}) but got ${actualType}`,
        )
      }
    }
  }

  // Strip extra keys not in schema (defense against stale/tampered JSON)
  for (const key of Object.keys(node.config)) {
    if (!schemaKeys.has(key)) {
      delete node.config[key]
    }
  }
}

// ─── Edge Shape Validation ───────────────────────────────────────────

export function validateEdgeShapeList(edges: unknown[]): asserts edges is SerializedEdge[] {
  edges.forEach((edge, index) => {
    if (typeof edge !== 'object' || edge === null || Array.isArray(edge)) {
      throw new Error(`Edge at index ${index}: must be a plain object`)
    }

    const record = edge as Record<string, unknown>

    // id
    if (typeof record.id !== 'string' || record.id.trim() === '') {
      throw new Error(`Edge at index ${index}: "id" must be a non-empty string`)
    }

    const edgeLabel = record.id

    // source
    if (typeof record.source !== 'string' || record.source.trim() === '') {
      throw new Error(`Edge "${edgeLabel}" at index ${index}: "source" must be a non-empty string`)
    }

    // target
    if (typeof record.target !== 'string' || record.target.trim() === '') {
      throw new Error(`Edge "${edgeLabel}" at index ${index}: "target" must be a non-empty string`)
    }

    // sourceHandle — string or null
    if (record.sourceHandle !== null && typeof record.sourceHandle !== 'string') {
      throw new Error(`Edge "${edgeLabel}" at index ${index}: "sourceHandle" must be a string or null`)
    }

    // targetHandle — string or null
    if (record.targetHandle !== null && typeof record.targetHandle !== 'string') {
      throw new Error(`Edge "${edgeLabel}" at index ${index}: "targetHandle" must be a string or null`)
    }
  })
}
