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
    <div class="node-renderer node-decision" :class="executionCssClass">
      <div class="node-header">
        {{ nodeRendererStrings.decisionNodeHeader }}
      </div>
      <div class="node-body">
        <span class="node-preview"
          >{{ data.workNode.config.targetField }}
          {{ data.workNode.config.operator }}
          {{ data.workNode.config.compareValue }}</span
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
.node-decision {
  border-left: 4px solid #f59e0b;
  min-height: 60px;
}
</style>
