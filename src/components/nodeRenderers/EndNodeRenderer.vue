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
  <div class="node-renderer node-end">
    <div class="node-header">⏹ End</div>
    <DynamicHandleRenderer :portDefinition="data.portDefinition" />
  </div>
</template>

<style scoped>
.node-end {
  border-left: 4px solid #ef4444;
}
</style>
