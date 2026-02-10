<template>
  <header class="app-header">
    <h1 class="app-title">⚡ Visual Workflow Studio</h1>

    <div class="header-actions">
      <button class="header-action-button" @click="handleExport">📤 Export</button>
      <button class="header-action-button" @click="handleImport">📥 Import</button>
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
import { ref } from 'vue'
import { useWorkflowCanvasStore } from '../../stores/workflowCanvasStore'

const workflowCanvasStore = useWorkflowCanvasStore()
const fileInputReference = ref<HTMLInputElement | null>(null)

function handleExport() {
  const jsonString = workflowCanvasStore.exportWorkflow()
  const blob = new Blob([jsonString], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(blob)

  const downloadAnchor = document.createElement('a')
  downloadAnchor.href = downloadUrl
  downloadAnchor.download = `workflow-${Date.now()}.json`
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()

  document.body.removeChild(downloadAnchor)
  URL.revokeObjectURL(downloadUrl)
}

function handleImport() {
  fileInputReference.value?.click()
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const jsonString = reader.result as string
    workflowCanvasStore.importWorkflow(jsonString)
  }
  reader.readAsText(file)

  // Reset so the same file can be re-imported
  target.value = ''
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  background: #1e1e2e;
  border-bottom: 1px solid #313244;
  flex-shrink: 0;
}

.app-title {
  color: #cdd6f4;
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-action-button {
  background: transparent;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.header-action-button:hover {
  background: #313244;
  border-color: #585b70;
}

.hidden-file-input {
  display: none;
}
</style>
