<script setup lang="ts">
import { MiniMap } from "@vue-flow/minimap";
import { WORKFLOW_CONSTANTS } from "../config/workflowConstants";
</script>

<template>
  <div class="workflow-mini-map-panel">
    <MiniMap
      :position="WORKFLOW_CONSTANTS.MINIMAP_POSITION"
      :width="WORKFLOW_CONSTANTS.MINIMAP_DEFAULT_WIDTH"
      :height="WORKFLOW_CONSTANTS.MINIMAP_DEFAULT_HEIGHT"
      :node-border-radius="WORKFLOW_CONSTANTS.MINIMAP_NODE_BORDER_RADIUS"
      :node-stroke-width="WORKFLOW_CONSTANTS.MINIMAP_NODE_STROKE_WIDTH"
      :node-height="WORKFLOW_CONSTANTS.MINIMAP_NODE_HEIGHT"
      :node-width="WORKFLOW_CONSTANTS.MINIMAP_NODE_WIDTH"
      :pannable="WORKFLOW_CONSTANTS.MINIMAP_PANNABLE"
      :zoomable="WORKFLOW_CONSTANTS.MINIMAP_ZOOMABLE"
      bg-color="var(--color-surface-primary)"
      mask-color="var(--color-background-secondary)"
      node-color="var(--color-accent-primary)"
      node-stroke-color="var(--color-border-strong)"
    />
  </div>
</template>

<style scoped>
.workflow-mini-map-panel :deep(svg) {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-small);
  box-shadow: var(--elevation-level-1);
}
.workflow-mini-map-panel :deep(.vue-flow__minimap) {
  background-color: var(--color-surface-primary);
}
</style>
