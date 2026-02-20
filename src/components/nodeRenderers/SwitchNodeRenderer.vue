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

function caseCount(): number {
  const cases = props.data.workNode.config.cases as unknown[];
  return Array.isArray(cases) ? cases.length : 0;
}
</script>

<template>
  <NodeRendererWrapper :nodeId="id">
    <div class="node-renderer node-switch" :class="executionCssClass">
      <div class="node-header">{{ nodeRendererStrings.switchNodeHeader }}</div>
      <div class="node-body">
        <span class="node-preview"
          >{{ data.workNode.config.targetField || "—" }} · {{ caseCount() }}
          {{ nodeRendererStrings.switchCaseLabel }}</span
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
.node-switch {
  border-left: 4px solid #8b5cf6;
  min-height: 60px;
}
</style>
