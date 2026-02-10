<script setup lang="ts">
import { useWorkflowCanvasStore } from '../stores/workflowCanvasStore'
import BaseTypography from './primitives/BaseTypography.vue'
import BaseSurface from './primitives/BaseSurface.vue'

const workflowStore = useWorkflowCanvasStore()
const nodeDefinitions = workflowStore.availableNodeDefinitions

function onDragStart(event: DragEvent, nodeType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/workflow-node-type', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
}
</script>

<template>
  <BaseSurface as="aside" variant="outlined" padding="large" class="workflow-toolbar">
    <BaseTypography as="h3" variant="headingSmall" class="toolbar-title">
      📦 Nodes
    </BaseTypography>
    <div class="toolbar-node-list">
      <BaseSurface
        v-for="definition in nodeDefinitions"
        :key="definition.type"
        as="div"
        variant="outlined"
        padding="medium"
        class="toolbar-node-item"
        draggable="true"
        @dragstart="onDragStart($event, definition.type)"
      >
        <span class="toolbar-node-icon">{{ definition.icon }}</span>
        <BaseTypography as="span" variant="body" class="toolbar-node-label">
          {{ definition.label }}
        </BaseTypography>
        <BaseTypography as="span" variant="micro" tone="muted" class="toolbar-node-category">
          {{ definition.category }}
        </BaseTypography>
      </BaseSurface>
    </div>
  </BaseSurface>
</template>

<style scoped>
.workflow-toolbar {
  width: 200px;
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-bottom: none;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
}

.toolbar-title {
  margin: 0 0 var(--space-2) 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-default);
}

.toolbar-node-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.toolbar-node-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 46px;
  cursor: grab;
  transition: all 0.15s ease;
  user-select: none;
}

.toolbar-node-item:hover {
  border-color: var(--color-border-strong);
  transform: translateX(2px);
}

.toolbar-node-item:active {
  cursor: grabbing;
}

.toolbar-node-icon {
  font-size: 16px;
}

.toolbar-node-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-node-category {
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 1023px) {
  .workflow-toolbar {
    width: 170px;
  }
}

@media (max-width: 767px) {
  .workflow-toolbar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border-default);
    max-height: 180px;
  }
}
</style>
