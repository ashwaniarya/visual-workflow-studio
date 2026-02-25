export interface ConfigFieldDefinition {
  key: string
  label: string
  fieldType: 'text' | 'number' | 'select' | 'json' | 'checkbox' | 'array'
  options?: string[]
  defaultValue?: unknown
  placeholder?: string
  min?: number
  max?: number
  visibleWhen?: {
    field: string
    in: unknown[]
  }
  itemFields?: ConfigFieldDefinition[]
}
