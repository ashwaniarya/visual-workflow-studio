<script setup lang="ts">
import { MiniMap } from "@vue-flow/minimap";
import { WORKFLOW_CONSTANTS } from "../config/workflowConstants";
</script>

<template>
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
  />
</template>
