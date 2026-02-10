<script setup lang="ts">
// Import registry to trigger built-in node registrations on app boot
import "./registry/nodeRegistry";
import { onMounted, onUnmounted } from "vue";
import { useWorkflowCanvasStore } from "./stores/workflowCanvasStore";
import { WORKFLOW_CONSTANTS } from "./config/workflowConstants";

import AppHeader from "./components/AppHeader.vue";
import WorkFlowToolBar from "./components/WorkFlowToolBar.vue";
import WorkFlowCanvas from "./components/WorkFlowCanvas.vue";
import WorkFlowConfigPanel from "./components/WorkFlowConfigPanel.vue";
import WorkFlowExecutionLog from "./components/WorkFlowExecutionLog.vue";

const workflowCanvasStore = useWorkflowCanvasStore();

function onGlobalWorkflowUndoRedoShortcut(keyboardEvent: KeyboardEvent) {
  const isModifierPressed = keyboardEvent.ctrlKey || keyboardEvent.metaKey;
  if (!isModifierPressed) {
    return;
  }

  const isUndoShortcut =
    keyboardEvent.key.toLowerCase() === "z" && !keyboardEvent.shiftKey;
  if (isUndoShortcut) {
    keyboardEvent.preventDefault();
    workflowCanvasStore.undoLastUiAction();
    return;
  }

  const isShiftRedoShortcut =
    keyboardEvent.key.toLowerCase() === "z" && keyboardEvent.shiftKey;
  const isDefaultRedoShortcut = WORKFLOW_CONSTANTS.REDO_SHORTCUT_KEYS.includes(
    keyboardEvent.key as (typeof WORKFLOW_CONSTANTS.REDO_SHORTCUT_KEYS)[number],
  ) && keyboardEvent.key.toLowerCase() === "y";

  if (isShiftRedoShortcut || isDefaultRedoShortcut) {
    keyboardEvent.preventDefault();
    workflowCanvasStore.redoLastUiAction();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalWorkflowUndoRedoShortcut);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalWorkflowUndoRedoShortcut);
});
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <div class="app-body">
      <WorkFlowToolBar />
      <div class="app-center">
        <WorkFlowCanvas />
        <WorkFlowExecutionLog />
      </div>
      <WorkFlowConfigPanel />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--color-background-primary);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 767px) {
  .app-body {
    flex-direction: column;
  }
}
</style>
