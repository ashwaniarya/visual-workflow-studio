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
        @update:model-value="onThemeModeChanged"
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </BaseInput>
      <BaseButton variant="ghost" size="small" @click="handleExport">
        📤 Export
      </BaseButton>
      <BaseButton variant="ghost" size="small" @click="handleImport">
        📥 Import
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
import { useWorkflowCanvasStore } from "../stores/workflowCanvasStore";
import {
  useThemePreferenceStore,
  type ThemeMode,
} from "../stores/themePreferenceStore";
import BaseButton from "./primitives/BaseButton.vue";
import BaseInput from "./primitives/BaseInput.vue";
import BaseTypography from "./primitives/BaseTypography.vue";

const workflowCanvasStore = useWorkflowCanvasStore();
const themePreferenceStore = useThemePreferenceStore();
const fileInputReference = ref<HTMLInputElement | null>(null);
const selectedThemeMode = computed(
  () => themePreferenceStore.selectedThemeMode,
);
const isWorkflowAutosaveInProgress = computed(
  () => workflowCanvasStore.isWorkflowAutosaveInProgress,
);

function handleExport() {
  const jsonString = workflowCanvasStore.exportWorkflow();
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
    workflowCanvasStore.importWorkflow(jsonString);
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
