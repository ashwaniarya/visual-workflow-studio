<script setup lang="ts">
import { computed } from "vue";
import { useWorkflowExecutionStore } from "../stores/workflowExecutionStore";
import BaseButton from "./primitives/BaseButton.vue";
import BaseSurface from "./primitives/BaseSurface.vue";
import BaseTypography from "./primitives/BaseTypography.vue";

const workflowExecutionStore = useWorkflowExecutionStore();
const executionLog = computed(() => workflowExecutionStore.executionLog);
const isExecuting = computed(() => workflowExecutionStore.isExecuting);

function runWorkflow() {
  workflowExecutionStore.runWorkflow();
}

function clearLog() {
  workflowExecutionStore.clearExecutionLog();
}

function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}
</script>

<template>
  <div class="execution-log-panel">
    <div class="log-header">
      <BaseTypography as="h3" variant="headingSmall" class="log-title">
        📋 Execution Log
      </BaseTypography>
      <div class="log-actions">
        <BaseButton
          variant="primary"
          size="small"
          :is-disabled="isExecuting"
          @click="runWorkflow"
        >
          {{ isExecuting ? "⏳ Running..." : "▶ Run" }}
        </BaseButton>
        <BaseButton variant="secondary" size="small" @click="clearLog">
          🗑 Clear
        </BaseButton>
      </div>
    </div>

    <div class="log-body">
      <template v-if="executionLog.length === 0">
        <div class="log-empty">
          <p>
            No execution log yet. Build a workflow and click
            <strong>Run</strong>.
          </p>
        </div>
      </template>

      <template v-else>
        <BaseSurface
          v-for="entry in executionLog"
          :key="entry.stepNumber"
          as="div"
          variant="outlined"
          padding="medium"
          class="log-entry"
          :class="{ 'log-error': entry.status === 'error' }"
        >
          <div class="log-entry-header">
            <span class="log-step">Step {{ entry.stepNumber }}</span>
            <span class="log-node-type">{{ entry.nodeType }}</span>
            <span class="log-status" :class="entry.status">{{
              entry.status
            }}</span>
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
              <span v-if="entry.nextNodeId">
                → Next: {{ entry.nextNodeId }}</span
              >
            </div>
            <div v-if="entry.errorMessage" class="log-error-message">
              ⚠ {{ entry.errorMessage }}
            </div>
          </div>
        </BaseSurface>
      </template>
    </div>
  </div>
</template>

<style scoped>
.execution-log-panel {
  height: 250px;
  background: var(--color-surface-primary);
  border-top: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-default);
}

.log-actions {
  display: flex;
  gap: var(--space-2);
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);
}

.log-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  font-size: var(--font-size-body-medium);
}

.log-entry {
  margin-bottom: var(--space-2);
}

.log-entry.log-error {
  border-color: var(--color-danger-primary);
}

.log-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-step {
  color: var(--color-accent-primary);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
}

.log-node-type {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  background: var(--color-surface-secondary);
  padding: 1px var(--space-2);
  border-radius: var(--radius-small);
}

.log-status {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  margin-left: auto;
}

.log-status.success {
  color: var(--color-success-primary);
}
.log-status.error {
  color: var(--color-danger-primary);
}

.log-entry-body {
  font-size: var(--font-size-body-small);
}

.log-payload {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}

.log-label {
  color: var(--color-text-muted);
  font-weight: var(--font-weight-semibold);
  min-width: 30px;
}

.log-payload code {
  color: var(--color-text-primary);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-body-small);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-port {
  color: var(--color-text-muted);
  font-size: var(--font-size-body-small);
  margin-top: 4px;
}

.log-port strong {
  color: var(--color-text-primary);
}

.log-error-message {
  color: var(--color-danger-primary);
  font-size: var(--font-size-body-small);
  margin-top: 4px;
}

@media (max-width: 767px) {
  .execution-log-panel {
    height: 200px;
  }

  .log-header {
    padding: var(--space-2) var(--space-3);
  }

  .log-body {
    padding: var(--space-2) var(--space-3);
  }
}
</style>
