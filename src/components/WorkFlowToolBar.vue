<script setup lang="ts">
import { useWorkflowCanvasStore } from '../stores/workflowCanvasStore'

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
  <aside class="workflow-toolbar">
    <h3 class="toolbar-title">📦 Nodes</h3>
    <div class="toolbar-node-list">
      <div
        v-for="definition in nodeDefinitions"
        :key="definition.type"
        class="toolbar-node-item"
        draggable="true"
        @dragstart="onDragStart($event, definition.type)"
      >
        <span class="toolbar-node-icon">{{ definition.icon }}</span>
        <span class="toolbar-node-label">{{ definition.label }}</span>
        <span class="toolbar-node-category">{{ definition.category }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.workflow-toolbar {
  width: 200px;
  background: #1e1e2e;
  border-right: 1px solid #313244;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.toolbar-title {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #313244;
}

.toolbar-node-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toolbar-node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.15s ease;
  user-select: none;
}

.toolbar-node-item:hover {
  background: #313244;
  border-color: #585b70;
  transform: translateX(2px);
}

.toolbar-node-item:active {
  cursor: grabbing;
}

.toolbar-node-icon {
  font-size: 16px;
}

.toolbar-node-label {
  color: #cdd6f4;
  font-size: 13px;
  font-weight: 500;
  flex: 1;
}

.toolbar-node-category {
  color: #6c7086;
  font-size: 10px;
  text-transform: uppercase;
}
</style>
