<script setup lang="ts">
import type { PortDefinition } from '../../models/ports'
import DynamicHandleRenderer from './DynamicHandleRenderer.vue'

defineProps<{
  data: {
    workNode: { type: string; config: Record<string, unknown> }
    portDefinition: PortDefinition
  }
}>()
</script>

<template>
  <div class="node-renderer node-start">
    <div class="node-header">▶ Start</div>
    <div class="node-body">
      <span class="node-preview">{{ JSON.stringify(data.workNode.config.inputPayload).slice(0, 30) }}</span>
    </div>
    <DynamicHandleRenderer :portDefinition="data.portDefinition" />
  </div>
</template>

<style scoped>
.node-start {
  border-left: 4px solid #22c55e;
}
</style>
