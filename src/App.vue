<script setup lang="ts">
// Import registry to trigger built-in node registrations on app boot
import "./registry/nodeRegistry";
import { defineAsyncComponent, onMounted, onUnmounted } from "vue";
import { useWorkflowHistoryStore } from "./stores/workflowHistoryStore";
import { useWorkflowPersistenceStore } from "./stores/workflowPersistenceStore";
import { WORKFLOW_CONSTANTS } from "./config/workflowConstants";
import { UI_STRINGS } from "./localization/uiStrings";

import AppHeader from "./components/AppHeader.vue";
import WorkFlowToolBar from "./components/WorkFlowToolBar.vue";
import WorkFlowConfigPanel from "./components/WorkFlowConfigPanel.vue";
import WorkFlowExecutionLog from "./components/WorkFlowExecutionLog.vue";
import GlobalActionModal from "./components/GlobalActionModal.vue";
import { HEAVY_COMPONENT_SPLIT_POLICY } from "./config/componentPerformanceConfig";

const workflowHistoryStore = useWorkflowHistoryStore();
const workflowPersistenceStore = useWorkflowPersistenceStore();
const appStrings = UI_STRINGS.app;
const workFlowCanvasSplitPolicy = HEAVY_COMPONENT_SPLIT_POLICY.workflowCanvas;

const AsyncWorkFlowCanvasRenderer = defineAsyncComponent({
  loader: () =>
    import(
      /* webpackChunkName: "workflow-canvas-chunk" */
      "./components/WorkFlowCanvas.vue"
    ),
  delay: workFlowCanvasSplitPolicy.fallbackDisplayDelayMilliseconds,
  timeout: workFlowCanvasSplitPolicy.loadTimeoutMilliseconds,
  onError(error, _retry, fail, attempts) {
    console.error(
      "WorkFlowCanvas chunk failed to load after",
      attempts,
      "attempt(s)",
      error,
    );
    fail();
  },
});

function onGlobalWorkflowUndoRedoShortcut(keyboardEvent: KeyboardEvent) {
  const isModifierPressed = keyboardEvent.ctrlKey || keyboardEvent.metaKey;
  if (!isModifierPressed) {
    return;
  }

  const isUndoShortcut =
    keyboardEvent.key.toLowerCase() === "z" && !keyboardEvent.shiftKey;
  if (isUndoShortcut) {
    keyboardEvent.preventDefault();
    workflowHistoryStore.undoLastUiAction({
      onAutosaveRequested: () =>
        workflowPersistenceStore.scheduleWorkflowAutosave(),
    });
    return;
  }

  const isShiftRedoShortcut =
    keyboardEvent.key.toLowerCase() === "z" && keyboardEvent.shiftKey;
  const isDefaultRedoShortcut =
    WORKFLOW_CONSTANTS.REDO_SHORTCUT_KEYS.includes(
      keyboardEvent.key as (typeof WORKFLOW_CONSTANTS.REDO_SHORTCUT_KEYS)[number],
    ) && keyboardEvent.key.toLowerCase() === "y";

  if (isShiftRedoShortcut || isDefaultRedoShortcut) {
    keyboardEvent.preventDefault();
    workflowHistoryStore.redoLastUiAction({
      onAutosaveRequested: () =>
        workflowPersistenceStore.scheduleWorkflowAutosave(),
    });
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
        <Suspense>
          <template #default>
            <AsyncWorkFlowCanvasRenderer />
          </template>
          <template #fallback>
            <div
              class="workflow-canvas-loading"
              role="status"
              aria-live="polite"
            >
              {{ appStrings.canvasLoadingMessage }}
            </div>
          </template>
        </Suspense>
        <WorkFlowExecutionLog />
      </div>
      <WorkFlowConfigPanel />
    </div>
    <GlobalActionModal />
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

.workflow-canvas-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

@media (max-width: 767px) {
  .app-body {
    flex-direction: column;
  }
}
</style>
