<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { workNode: { type: string; config: Record<string, unknown> } }
}>()
</script>

<template>
  <div class="node-renderer node-start">
    <div class="node-header">▶ Start</div>
    <div class="node-body">
      <span class="node-preview">{{ JSON.stringify(data.workNode.config.inputPayload).slice(0, 30) }}</span>
    </div>
    <Handle type="source" :position="Position.Right" id="out-0" class="handle-source" />
  </div>
</template>

<style scoped>
.node-start {
  border-left: 4px solid #22c55e;
}
</style>
