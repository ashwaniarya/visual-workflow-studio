<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { workNode: { type: string; config: Record<string, unknown> } }
}>()
</script>

<template>
  <div class="node-renderer node-end">
    <div class="node-header">⏹ End</div>
    <Handle type="target" :position="Position.Left" class="handle-target" />
  </div>
</template>

<style scoped>
.node-end {
  border-left: 4px solid #ef4444;
}
</style>
