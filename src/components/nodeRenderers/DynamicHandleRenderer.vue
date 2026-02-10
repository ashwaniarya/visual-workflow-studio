<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { PortDefinition, OutputPortDefinition } from '../../models/ports'

const props = defineProps<{
  portDefinition: PortDefinition
}>()

function computeOutputPortTopPercent(index: number, totalPorts: number): string {
  if (totalPorts === 1) return '50%'
  return `${((index + 1) / (totalPorts + 1)) * 100}%`
}

function getHandleStyle(port: OutputPortDefinition, index: number, totalPorts: number): Record<string, string> {
  const style: Record<string, string> = {}
  if (totalPorts > 1) {
    style.top = computeOutputPortTopPercent(index, totalPorts)
  }
  if (port.color) {
    style.background = port.color
  }
  return style
}
</script>

<template>
  <!-- Input handle -->
  <Handle
    v-if="portDefinition.inputCount > 0"
    type="target"
    :position="Position.Left"
    class="handle-target"
  />

  <!-- Output handles -->
  <Handle
    v-for="(port, index) in portDefinition.outputPorts"
    :key="port.id"
    type="source"
    :position="Position.Right"
    :id="port.id"
    class="handle-source"
    :style="getHandleStyle(port, index, portDefinition.outputPorts.length)"
  />

  <!-- Port labels (only when multiple outputs) -->
  <div v-if="portDefinition.outputPorts.length > 1" class="dynamic-port-labels">
    <span
      v-for="(port, index) in portDefinition.outputPorts"
      :key="`label-${port.id}`"
      class="dynamic-port-label"
      :style="{
        top: computeOutputPortTopPercent(index, portDefinition.outputPorts.length),
        color: port.color ?? 'inherit',
      }"
    >
      {{ port.label }}
    </span>
  </div>
</template>

<style scoped>
.dynamic-port-labels {
  position: absolute;
  right: -8px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.dynamic-port-label {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 700;
  padding-right: 16px;
  white-space: nowrap;
}
</style>
