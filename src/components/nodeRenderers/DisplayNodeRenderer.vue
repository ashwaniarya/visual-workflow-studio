<script setup lang="ts">
import type { IRenderWorkNodeProps } from "../../models/renderWorkNode";
import NodeRendererWrapper from "./NodeRendererWrapper.vue";
import { useNodeExecutionState } from "../../composables/useNodeExecutionState";
import DynamicHandleRenderer from "./DynamicHandleRenderer.vue";
const props = defineProps<IRenderWorkNodeProps>();

const { executionCssClass, executionErrorMessage, executionState } =
  useNodeExecutionState(props.id);

console.log("executionContext", executionState);
</script>

<template>
  <NodeRendererWrapper :nodeId="id">
    <div class="node-renderer node-display" :class="executionCssClass">
      <div class="node-body">
        <span class="node-preview">Display</span>
      </div>
      <div v-if="executionErrorMessage" class="node-error-banner">
        ⚠️ {{ executionErrorMessage }}
      </div>
      <div class="node-body" v-if="executionState">
        <span class="node-preview">{{
          JSON.stringify(executionState.metaData.outputPayload)
        }}</span>
      </div>
      <DynamicHandleRenderer :portDefinition="props.data.portDefinition" />
    </div>
  </NodeRendererWrapper>
</template>
