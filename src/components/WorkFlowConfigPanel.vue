<script setup lang="ts">
import { computed } from "vue";
import { useWorkflowCanvasStore } from "../stores/workflowCanvasStore";

const workflowStore = useWorkflowCanvasStore();

const selectedNode = computed(() => workflowStore.selectedNode);
const selectedNodeDefinition = computed(
  () => workflowStore.selectedNodeDefinition,
);
const workNode = computed(() => selectedNode.value?.data?.workNode);
const configSchema = computed(
  () => selectedNodeDefinition.value?.configSchema ?? [],
);

function isFieldVisible(field: {
  visibleWhen?: { field: string; in: unknown[] };
}): boolean {
  if (!field.visibleWhen || !workNode.value) return true;
  const dependentValue = workNode.value.config[field.visibleWhen.field];
  return field.visibleWhen.in.includes(dependentValue);
}

function onFieldChange(key: string, value: unknown) {
  if (!selectedNode.value) return;
  workflowStore.updateConfigOfNodeById(selectedNode.value.id, key, value);
}

function onJsonFieldChange(key: string, rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue);
    onFieldChange(key, parsed);
  } catch {
    // Ignore invalid JSON while user is typing
  }
}

function formatJsonValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<template>
  <aside class="config-panel" :class="{ 'panel-open': selectedNode }">
    <template v-if="selectedNode && workNode && selectedNodeDefinition">
      <div class="panel-header">
        <span class="panel-icon">{{ selectedNodeDefinition.icon }}</span>
        <h3 class="panel-title">{{ selectedNodeDefinition.label }} Config</h3>
        <button
          class="panel-close"
          @click="workflowStore.setSelectedNode(null)"
        >
          ✕
        </button>
      </div>

      <div class="panel-body">
        <div class="field-group">
          <label class="field-label">Node ID</label>
          <input class="field-input" :value="workNode.id" disabled />
        </div>

        <template v-for="field in configSchema" :key="field.key">
          <div v-if="isFieldVisible(field)" class="field-group">
            <label class="field-label">{{ field.label }}</label>

            <!-- Text input -->
            <input
              v-if="field.fieldType === 'text'"
              class="field-input"
              type="text"
              :placeholder="field.placeholder"
              :value="workNode.config[field.key] as string"
              @input="
                onFieldChange(
                  field.key,
                  ($event.target as HTMLInputElement).value,
                )
              "
            />

            <!-- Number input -->
            <input
              v-else-if="field.fieldType === 'number'"
              class="field-input"
              type="number"
              :placeholder="field.placeholder"
              :value="workNode.config[field.key] as number"
              @input="
                onFieldChange(
                  field.key,
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />

            <!-- Select input -->
            <select
              v-else-if="field.fieldType === 'select'"
              class="field-input"
              :value="workNode.config[field.key] as string"
              @change="
                onFieldChange(
                  field.key,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option
                v-for="option in field.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>

            <!-- JSON input -->
            <textarea
              v-else-if="field.fieldType === 'json'"
              class="field-input field-textarea"
              :placeholder="field.placeholder"
              :value="formatJsonValue(workNode.config[field.key])"
              @input="
                onJsonFieldChange(
                  field.key,
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />

            <!-- Checkbox -->
            <label
              v-else-if="field.fieldType === 'checkbox'"
              class="field-checkbox"
            >
              <input
                type="checkbox"
                :checked="workNode.config[field.key] as boolean"
                @change="
                  onFieldChange(
                    field.key,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              {{ field.label }}
            </label>
          </div>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="panel-empty">
        <p>👈 Select a node to configure</p>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.config-panel {
  width: 280px;
  background: #1e1e2e;
  border-left: 1px solid #313244;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: all 0.2s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  border-bottom: 1px solid #313244;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.panel-close {
  background: none;
  border: none;
  color: #6c7086;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.panel-close:hover {
  background: #313244;
  color: #cdd6f4;
}

.panel-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: #a6adc8;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-input {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 6px;
  color: #cdd6f4;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.field-input:focus {
  border-color: #89b4fa;
}

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: "Fira Code", "Cascadia Code", monospace;
  font-size: 12px;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cdd6f4;
  font-size: 13px;
  cursor: pointer;
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.panel-empty p {
  color: #6c7086;
  font-size: 13px;
  text-align: center;
}
</style>
