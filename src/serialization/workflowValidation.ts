import { WORKFLOW_CONSTANTS } from '../config/workflowConstants'
import { getNodeDefinition } from '../registry/nodeRegistry'
import type {
  SerializedWorkflow,
  SerializedWorkNode,
  SerializedEdge,
  SerializedViewport,
} from '../models/serialization'

// ─── Envelope Validation ─────────────────────────────────────────────

export function resolveCanonicalNodeType(candidateType: string): string {
  const aliasTable = WORKFLOW_CONSTANTS.NODE_TYPE_ALIASES
  return aliasTable[candidateType as keyof typeof aliasTable] ?? candidateType
}

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
    if (typeof record.type !== 'string') {
      throw new Error(`Node "${nodeLabel}" at index ${index}: "type" must be a string`)
    }

    const rawTypeValue = record.type
    const canonicalType = resolveCanonicalNodeType(rawTypeValue)
    record.type = canonicalType
    if (!validTypes.includes(canonicalType)) {
      throw new Error(
        `Node "${nodeLabel}" at index ${index}: "type" must be one of [${validTypes.join(', ')}], got "${rawTypeValue}"`,
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
  array: 'object', // arrays are typeof 'object'
}

export function validateNodeConfig(node: SerializedWorkNode): void {
  const canonicalType = resolveCanonicalNodeType(node.type)
  node.type = canonicalType
  const definition = getNodeDefinition(canonicalType)
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
      // array field: must be an actual array, validate each entry's sub-fields
      } else if (field.fieldType === 'array') {
        if (!Array.isArray(value)) {
          throw new Error(
            `Node "${node.id}": config key "${field.key}" expected array but got ${actualType}`,
          )
        }
        if (field.itemFields) {
          const itemFieldTypes: Record<string, string> = {}
          for (const itemField of field.itemFields) {
            const mapped = FIELD_TYPE_TO_EXPECTED_TYPEOF[itemField.fieldType]
            if (mapped) itemFieldTypes[itemField.key] = mapped
          }
          for (let entryIndex = 0; entryIndex < value.length; entryIndex++) {
            const entry = value[entryIndex] as Record<string, unknown>
            if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
              throw new Error(
                `Node "${node.id}": config key "${field.key}[${entryIndex}]" must be a plain object`,
              )
            }
            for (const itemField of field.itemFields) {
              const entryValue = entry[itemField.key]
              const expectedItemType = itemFieldTypes[itemField.key]
              if (entryValue !== undefined && expectedItemType && typeof entryValue !== expectedItemType) {
                throw new Error(
                  `Node "${node.id}": config key "${field.key}[${entryIndex}].${itemField.key}" expected ${expectedItemType} but got ${typeof entryValue}`,
                )
              }
            }
          }
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

// ─── Viewport Validation (optional) ────────────────────────────────────

export function validateViewport(viewport: unknown): asserts viewport is SerializedViewport {
  if (typeof viewport !== 'object' || viewport === null || Array.isArray(viewport)) {
    throw new Error('Invalid workflow JSON: "viewport" must be a plain object when present')
  }

  const record = viewport as Record<string, unknown>

  if (typeof record.x !== 'number' || typeof record.y !== 'number' || typeof record.zoom !== 'number') {
    throw new Error('Invalid workflow JSON: "viewport" must have numeric "x", "y", and "zoom" fields')
  }
}
