<script setup lang="ts">
import DynamicHandleRenderer from "./DynamicHandleRenderer.vue";
import NodeRendererWrapper from "./NodeRendererWrapper.vue";
import { useNodeExecutionState } from "../../composables/useNodeExecutionState";
import { UI_STRINGS } from "../../localization/uiStrings";
import type { IRenderWorkNodeProps } from "../../models/renderWorkNode";

const props = defineProps<IRenderWorkNodeProps>();

const { executionCssClass, executionErrorMessage } = useNodeExecutionState(
  props.id,
);
const nodeRendererStrings = UI_STRINGS.nodeRenderers;
</script>

<template>
  <NodeRendererWrapper :nodeId="id">
    <div class="node-renderer node-url-shortener" :class="executionCssClass">
      <div class="node-header">
        {{ nodeRendererStrings.urlShortenerNodeHeader }}
      </div>
      <div class="node-body">
        <span class="node-preview"
          >{{ data.workNode.config.targetField || "—" }} ·
          {{ data.workNode.config.shortenedLength }} chars</span
        >
      </div>
      <div v-if="executionErrorMessage" class="node-error-banner">
        ⚠️ {{ executionErrorMessage }}
      </div>
      <DynamicHandleRenderer :portDefinition="data.portDefinition" />
    </div>
  </NodeRendererWrapper>
</template>

<style scoped>
.node-url-shortener {
  border-left: 4px solid #06b6d4;
}
</style>
