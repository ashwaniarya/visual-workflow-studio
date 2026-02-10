<script setup lang="ts">
import { computed } from 'vue'
import { useWorkflowCanvasStore } from '../stores/workflowCanvasStore'

const workflowStore = useWorkflowCanvasStore()
const executionLog = computed(() => workflowStore.executionLog)
const isExecuting = computed(() => workflowStore.isExecuting)

function runWorkflow() {
  workflowStore.runWorkflow()
}

function clearLog() {
  workflowStore.clearExecutionLog()
}

function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}
</script>

<template>
  <div class="execution-log-panel">
    <div class="log-header">
      <h3 class="log-title">📋 Execution Log</h3>
      <div class="log-actions">
        <button
          class="log-btn log-btn-run"
          :disabled="isExecuting"
          @click="runWorkflow"
        >
          {{ isExecuting ? '⏳ Running...' : '▶ Run' }}
        </button>
        <button class="log-btn log-btn-clear" @click="clearLog">
          🗑 Clear
        </button>
      </div>
    </div>

    <div class="log-body">
      <template v-if="executionLog.length === 0">
        <div class="log-empty">
          <p>No execution log yet. Build a workflow and click <strong>Run</strong>.</p>
        </div>
      </template>

      <template v-else>
        <div
          v-for="entry in executionLog"
          :key="entry.stepNumber"
          class="log-entry"
          :class="{ 'log-error': entry.status === 'error' }"
        >
          <div class="log-entry-header">
            <span class="log-step">Step {{ entry.stepNumber }}</span>
            <span class="log-node-type">{{ entry.nodeType }}</span>
            <span class="log-status" :class="entry.status">{{ entry.status }}</span>
          </div>

          <div class="log-entry-body">
            <div class="log-payload">
              <span class="log-label">In:</span>
              <code>{{ formatPayload(entry.inputPayload) }}</code>
            </div>
            <div class="log-payload">
              <span class="log-label">Out:</span>
              <code>{{ formatPayload(entry.outputPayload) }}</code>
            </div>
            <div v-if="entry.selectedPortId" class="log-port">
              → Port: <strong>{{ entry.selectedPortId }}</strong>
              <span v-if="entry.nextNodeId"> → Next: {{ entry.nextNodeId }}</span>
            </div>
            <div v-if="entry.errorMessage" class="log-error-message">
              ⚠ {{ entry.errorMessage }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.execution-log-panel {
  height: 220px;
  background: #1e1e2e;
  border-top: 1px solid #313244;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #313244;
}

.log-title {
  color: #cdd6f4;
  font-size: 13px;
  font-weight: 600;
  margin: 0;
}

.log-actions {
  display: flex;
  gap: 6px;
}

.log-btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.log-btn-run {
  background: #22c55e;
  color: #000;
}

.log-btn-run:hover {
  background: #16a34a;
}

.log-btn-run:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-btn-clear {
  background: #313244;
  color: #cdd6f4;
}

.log-btn-clear:hover {
  background: #45475a;
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.log-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c7086;
  font-size: 13px;
}

.log-entry {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 6px;
}

.log-entry.log-error {
  border-color: #ef4444;
}

.log-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-step {
  color: #89b4fa;
  font-size: 11px;
  font-weight: 700;
}

.log-node-type {
  color: #a6adc8;
  font-size: 11px;
  background: #313244;
  padding: 1px 6px;
  border-radius: 4px;
}

.log-status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  margin-left: auto;
}

.log-status.success { color: #22c55e; }
.log-status.error { color: #ef4444; }

.log-entry-body {
  font-size: 12px;
}

.log-payload {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}

.log-label {
  color: #6c7086;
  font-weight: 600;
  min-width: 30px;
}

.log-payload code {
  color: #cdd6f4;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-port {
  color: #6c7086;
  font-size: 11px;
  margin-top: 4px;
}

.log-port strong {
  color: #cdd6f4;
}

.log-error-message {
  color: #ef4444;
  font-size: 11px;
  margin-top: 4px;
}
</style>
