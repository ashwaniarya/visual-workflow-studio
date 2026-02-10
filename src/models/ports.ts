export interface OutputPortDefinition {
  id: string
  label: string
}

export interface PortDefinition {
  inputCount: number
  outputPorts: OutputPortDefinition[]
}
