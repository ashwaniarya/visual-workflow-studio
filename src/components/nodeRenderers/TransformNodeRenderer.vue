<script setup lang="ts">
import type { PortDefinition } from "../../models/ports";
import DynamicHandleRenderer from "./DynamicHandleRenderer.vue";
import NodeRendererWrapper from "./NodeRendererWrapper.vue";
import { useNodeExecutionState } from "../../composables/useNodeExecutionState";
import { UI_STRINGS } from "../../localization/uiStrings";

const props = defineProps<{
  id: string;
  data: {
    workNode: { type: string; config: Record<string, unknown> };
    portDefinition: PortDefinition;
  };
}>();

const { executionCssClass, executionErrorMessage } = useNodeExecutionState(
  props.id,
);
const nodeRendererStrings = UI_STRINGS.nodeRenderers;
</script>

<template>
  <NodeRendererWrapper :nodeId="id">
    <div class="node-renderer node-transform" :class="executionCssClass">
      <div class="node-header">
        {{ nodeRendererStrings.transformNodeHeader }}
      </div>
      <div class="node-body">
        <span class="node-preview"
          >{{ data.workNode.config.mode }} →
          {{ data.workNode.config.targetField }}</span
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
.node-transform {
  border-left: 4px solid #3b82f6;
}
</style>
