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
  <div class="node-renderer node-transform">
    <div class="node-header">🔄 Transform</div>
    <div class="node-body">
      <span class="node-preview">{{ data.workNode.config.mode }} → {{ data.workNode.config.targetField }}</span>
    </div>
    <DynamicHandleRenderer :portDefinition="data.portDefinition" />
  </div>
</template>

<style scoped>
.node-transform {
  border-left: 4px solid #3b82f6;
}
</style>
