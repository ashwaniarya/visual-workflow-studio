<template>
  <header class="app-header">
    <BaseTypography as="h1" variant="headingMedium" class="app-title">
      ⚡ Visual Workflow Studio
    </BaseTypography>

    <div class="header-actions">
      <div
        v-if="isWorkflowAutosaveInProgress"
        class="autosave-indicator"
        aria-live="polite"
      >
        <span class="autosave-spinner" aria-hidden="true"></span>
        <BaseTypography as="span" variant="caption" tone="muted">
          Saving
        </BaseTypography>
      </div>
      <BaseInput
        element-type="select"
        class="header-theme-mode-input"
        :model-value="selectedThemeMode"
        accessible-label="Select application theme mode"
        @update:model-value="onThemeModeChanged"
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </BaseInput>
      <BaseButton
        variant="ghost"
        size="small"
        accessible-label="Export workflow as JSON file"
        @click="handleExport"
      >
        📤 Export
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="small"
        accessible-label="Import workflow from JSON file"
        @click="handleImport"
      >
        📥 Import
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="small"
        accessible-label="Clear workflow after confirmation"
        @click="openClearWorkflowConfirmationModal"
      >
        🧹 Clear Workflow
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="small"
        :is-disabled="!canUndoUiAction"
        accessible-label="Undo last workflow action"
        @click="handleUndoAction"
      >
        ↶ Undo
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="small"
        :is-disabled="!canRedoUiAction"
        accessible-label="Redo last workflow action"
        @click="handleRedoAction"
      >
        ↷ Redo
      </BaseButton>
      <input
        ref="fileInputReference"
        type="file"
        accept=".json"
        class="hidden-file-input"
        @change="onFileSelected"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useWorkflowGraphStore } from "../stores/workflowGraphStore";
import { useWorkflowHistoryStore } from "../stores/workflowHistoryStore";
import { useWorkflowPersistenceStore } from "../stores/workflowPersistenceStore";
import { useWorkflowExecutionStore } from "../stores/workflowExecutionStore";
import { useGlobalUIStore } from "../stores/globalUIStore";
import {
  useThemePreferenceStore,
  type ThemeMode,
} from "../stores/themePreferenceStore";
import BaseButton from "./primitives/BaseButton.vue";
import BaseInput from "./primitives/BaseInput.vue";
import BaseTypography from "./primitives/BaseTypography.vue";

const workflowGraphStore = useWorkflowGraphStore();
const workflowHistoryStore = useWorkflowHistoryStore();
const workflowPersistenceStore = useWorkflowPersistenceStore();
const workflowExecutionStore = useWorkflowExecutionStore();
const globalUIStore = useGlobalUIStore();
const themePreferenceStore = useThemePreferenceStore();
const fileInputReference = ref<HTMLInputElement | null>(null);
const selectedThemeMode = computed(
  () => themePreferenceStore.selectedThemeMode,
);
const isWorkflowAutosaveInProgress = computed(
  () => workflowPersistenceStore.isWorkflowAutosaveInProgress,
);
const canUndoUiAction = computed(() => workflowHistoryStore.canUndoUiAction);
const canRedoUiAction = computed(() => workflowHistoryStore.canRedoUiAction);

function handleExport() {
  const jsonString = workflowPersistenceStore.exportWorkflow(
    workflowGraphStore.graphNodes,
    workflowGraphStore.graphEdges,
    workflowGraphStore.canvasViewport ?? undefined,
  );
  const blob = new Blob([jsonString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);

  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = downloadUrl;
  downloadAnchor.download = `workflow-${Date.now()}.json`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();

  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(downloadUrl);
}

function handleImport() {
  fileInputReference.value?.click();
}

function openClearWorkflowConfirmationModal() {
  globalUIStore.openModal({
    title: "Clear workflow?",
    message: "Are you sure you want to clear?",
    actionButtonMap: {
      dismissClearWorkflowModal: {
        buttonLabel: "No",
        buttonVariant: "secondary",
        callback: () => "dismiss" as const,
      },
      confirmClearWorkflowData: {
        buttonLabel: "Yes",
        buttonVariant: "danger",
        callback: async () => {
          await workflowPersistenceStore.waitForAutosaveToSettle();
          workflowGraphStore.replaceGraphData([], [], {
            shouldAutosave: false,
          });
          workflowGraphStore.setSelectedNode(null);
          workflowHistoryStore.clearUiCommandHistory();
          workflowExecutionStore.clearExecutionLog();
          workflowPersistenceStore.clearPersistedWorkflowSnapshot();
          return "dismiss" as const;
        },
      },
    },
  });
}

function handleUndoAction() {
  workflowHistoryStore.undoLastUiAction({
    onAutosaveRequested: () =>
      workflowPersistenceStore.scheduleWorkflowAutosave(),
  });
}

function handleRedoAction() {
  workflowHistoryStore.redoLastUiAction({
    onAutosaveRequested: () =>
      workflowPersistenceStore.scheduleWorkflowAutosave(),
  });
}

function onThemeModeChanged(themeMode: string) {
  if (themeMode === "light" || themeMode === "dark" || themeMode === "system") {
    themePreferenceStore.setThemeMode(themeMode as ThemeMode);
  }
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const jsonString = reader.result as string;
    workflowPersistenceStore.importWorkflow(jsonString);
  };
  reader.readAsText(file);

  // Reset so the same file can be re-imported
  target.value = "";
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 48px;
  background: var(--color-surface-primary);
  border-bottom: 1px solid var(--color-border-default);
  flex-shrink: 0;
}

.app-title {
  margin-right: var(--space-4);
}

.header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.autosave-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 70px;
}

.autosave-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-border-default);
  border-top-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: autosave-spin 0.8s linear infinite;
}

.hidden-file-input {
  display: none;
}

.header-theme-mode-input {
  width: 110px;
}

@keyframes autosave-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .app-header {
    padding: 0 var(--space-3);
    height: 56px;
  }

  .app-title {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-actions {
    gap: var(--space-1);
  }

  .header-theme-mode-input {
    width: 96px;
  }
}
</style>
