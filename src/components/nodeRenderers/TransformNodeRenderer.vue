<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { workNode: { type: string; config: Record<string, unknown> } }
}>()
</script>

<template>
  <div class="node-renderer node-transform">
    <div class="node-header">🔄 Transform</div>
    <div class="node-body">
      <span class="node-preview">{{ data.workNode.config.mode }} → {{ data.workNode.config.targetField }}</span>
    </div>
    <Handle type="target" :position="Position.Left" class="handle-target" />
    <Handle type="source" :position="Position.Right" id="out-0" class="handle-source" />
  </div>
</template>

<style scoped>
.node-transform {
  border-left: 4px solid #3b82f6;
}
</style>
