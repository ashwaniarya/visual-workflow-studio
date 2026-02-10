export interface ConfigFieldDefinition {
  key: string
  label: string
  fieldType: 'text' | 'number' | 'select' | 'json' | 'checkbox'
  options?: string[]
  defaultValue?: unknown
  placeholder?: string
  visibleWhen?: {
    field: string
    in: unknown[]
  }
}
