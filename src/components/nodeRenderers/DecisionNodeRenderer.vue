<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

defineProps<{
  data: { workNode: { type: string; config: Record<string, unknown> } };
}>();
</script>

<template>
  <div class="node-renderer node-decision">
    <div class="node-header">🔀 Decision</div>
    <div class="node-body">
      <span class="node-preview"
        >{{ data.workNode.config.targetField }}
        {{ data.workNode.config.operator }}
        {{ data.workNode.config.compareValue }}</span
      >
    </div>
    <Handle type="target" :position="Position.Left" class="handle-target" />
    <Handle
      type="source"
      :position="Position.Right"
      id="true-branch"
      class="handle-source handle-true"
      style="top: 30%"
    />
    <Handle
      type="source"
      :position="Position.Right"
      id="false-branch"
      class="handle-source handle-false"
      style="top: 70%"
    />
    <div class="branch-labels">
      <span class="branch-label branch-true">T</span>
      <span class="branch-label branch-false">F</span>
    </div>
  </div>
</template>

<style scoped>
.node-decision {
  border-left: 4px solid #f59e0b;
  min-height: 60px;
}
.branch-labels {
  position: absolute;
  right: -8px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  pointer-events: none;
}
.branch-label {
  font-size: 10px;
  font-weight: 700;
  padding-right: 16px;
}
.branch-true {
  color: #22c55e;
}
.branch-false {
  color: #ef4444;
}
.handle-true {
  background: #22c55e !important;
}
.handle-false {
  background: #ef4444 !important;
}
</style>
