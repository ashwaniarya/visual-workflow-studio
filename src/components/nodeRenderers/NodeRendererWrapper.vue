<script setup lang="ts">
import { useWorkflowGraphStore } from "../../stores/workflowGraphStore";
import { UI_STRINGS } from "../../localization/uiStrings";

const props = defineProps<{
  nodeId: string;
}>();

const workflowGraphStore = useWorkflowGraphStore();
const nodeRendererStrings = UI_STRINGS.nodeRenderers;

function handleDeleteNode() {
  workflowGraphStore.removeNode(props.nodeId);
}
</script>

<template>
  <div class="node-renderer-wrapper">
    <button
      class="node-delete-button"
      @click.stop="handleDeleteNode"
      :title="nodeRendererStrings.deleteNodeButtonTitle"
      :aria-label="nodeRendererStrings.deleteNodeButtonAriaLabel"
    >
      <span aria-hidden="true">🗑️</span>
    </button>
    <slot />
  </div>
</template>

<style scoped>
.node-renderer-wrapper {
  position: relative;
}

.node-delete-button {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 10;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid #45475a;
  background: #1e1e2e;
  color: #f38ba8;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
  padding: 0;
  line-height: 1;
}

.node-renderer-wrapper:hover .node-delete-button {
  opacity: 1;
}

.node-delete-button:hover {
  background: #f38ba8;
  color: #1e1e2e;
  border-color: #f38ba8;
}

.node-delete-button:focus-visible {
  opacity: 1;
  outline: 2px solid #f38ba8;
  outline-offset: 2px;
}
</style>
