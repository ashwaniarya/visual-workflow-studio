<script setup lang="ts">
import type { PortDefinition } from "../../models/ports";
import DynamicHandleRenderer from "./DynamicHandleRenderer.vue";
import NodeRendererWrapper from "./NodeRendererWrapper.vue";
import { useNodeExecutionState } from "../../composables/useNodeExecutionState";

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
</script>

<template>
  <NodeRendererWrapper :nodeId="id">
    <div class="node-renderer node-end" :class="executionCssClass">
      <div class="node-header">⏹ End</div>
      <div v-if="executionErrorMessage" class="node-error-banner">
        ⚠️ {{ executionErrorMessage }}
      </div>
      <DynamicHandleRenderer :portDefinition="data.portDefinition" />
    </div>
  </NodeRendererWrapper>
</template>

<style scoped>
.node-end {
  border-left: 4px solid #ef4444;
}
</style>
