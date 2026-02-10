export interface OutputPortDefinition {
  id: string
  label: string
  color?: string
}

export interface PortDefinition {
  inputCount: number
  outputPorts: OutputPortDefinition[]
}
