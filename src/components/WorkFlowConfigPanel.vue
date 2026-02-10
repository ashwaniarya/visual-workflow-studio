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

// ─── Array field helpers ─────────────────────────────────────────────

function getArrayEntries(key: string): Record<string, unknown>[] {
  const raw = workNode.value?.config[key];
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

function onArrayEntryFieldChange(
  arrayKey: string,
  entryIndex: number,
  fieldKey: string,
  value: unknown,
) {
  const entries = [...getArrayEntries(arrayKey)];
  entries[entryIndex] = { ...entries[entryIndex], [fieldKey]: value };
  onFieldChange(arrayKey, entries);
}

function addArrayEntry(field: { key: string; itemFields?: { key: string; defaultValue?: unknown }[] }) {
  const entries = [...getArrayEntries(field.key)];
  const newEntry: Record<string, unknown> = {};
  for (const itemField of field.itemFields ?? []) {
    newEntry[itemField.key] = itemField.defaultValue ?? "";
  }
  entries.push(newEntry);
  onFieldChange(field.key, entries);
}

function removeArrayEntry(arrayKey: string, entryIndex: number) {
  const entries = [...getArrayEntries(arrayKey)];
  entries.splice(entryIndex, 1);
  onFieldChange(arrayKey, entries);
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

            <!-- Array field (dynamic repeatable entries) -->
            <template v-else-if="field.fieldType === 'array' && field.itemFields">
              <div
                v-for="(entry, entryIndex) in getArrayEntries(field.key)"
                :key="`${field.key}-${entryIndex}`"
                class="array-entry-card"
              >
                <div class="array-entry-header">
                  <span class="array-entry-index">#{{ entryIndex + 1 }}</span>
                  <button
                    class="array-entry-remove"
                    @click="removeArrayEntry(field.key, entryIndex)"
                    title="Remove entry"
                  >
                    ✕
                  </button>
                </div>
                <div
                  v-for="itemField in field.itemFields"
                  :key="`${field.key}-${entryIndex}-${itemField.key}`"
                  class="array-item-field"
                >
                  <label class="field-label field-label-sm">{{ itemField.label }}</label>

                  <!-- Sub-field: text -->
                  <input
                    v-if="itemField.fieldType === 'text'"
                    class="field-input"
                    type="text"
                    :placeholder="itemField.placeholder"
                    :value="(entry as Record<string, unknown>)[itemField.key] as string"
                    @input="
                      onArrayEntryFieldChange(
                        field.key,
                        entryIndex,
                        itemField.key,
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />

                  <!-- Sub-field: number -->
                  <input
                    v-else-if="itemField.fieldType === 'number'"
                    class="field-input"
                    type="number"
                    :placeholder="itemField.placeholder"
                    :value="(entry as Record<string, unknown>)[itemField.key] as number"
                    @input="
                      onArrayEntryFieldChange(
                        field.key,
                        entryIndex,
                        itemField.key,
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                  />

                  <!-- Sub-field: select -->
                  <select
                    v-else-if="itemField.fieldType === 'select'"
                    class="field-input"
                    :value="(entry as Record<string, unknown>)[itemField.key] as string"
                    @change="
                      onArrayEntryFieldChange(
                        field.key,
                        entryIndex,
                        itemField.key,
                        ($event.target as HTMLSelectElement).value,
                      )
                    "
                  >
                    <option
                      v-for="option in itemField.options"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </div>
              </div>

              <button
                class="array-add-button"
                @click="addArrayEntry(field)"
              >
                + Add {{ field.label?.replace(/s$/, '') || 'Entry' }}
              </button>
            </template>
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

/* ─── Array field styles ────────────────────────────────────────────── */

.array-entry-card {
  background: #11111b;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
}

.array-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.array-entry-index {
  color: #6c7086;
  font-size: 11px;
  font-weight: 700;
}

.array-entry-remove {
  background: none;
  border: none;
  color: #6c7086;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.array-entry-remove:hover {
  background: #45475a;
  color: #f38ba8;
}

.array-item-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.field-label-sm {
  font-size: 10px;
}

.array-add-button {
  width: 100%;
  padding: 6px 10px;
  background: #181825;
  border: 1px dashed #45475a;
  border-radius: 6px;
  color: #89b4fa;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.array-add-button:hover {
  background: #1e1e2e;
  border-color: #89b4fa;
}
</style>
