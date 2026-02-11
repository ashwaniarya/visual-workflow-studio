<script setup lang="ts">
import { computed } from "vue";
import { useWorkflowGraphStore } from "../stores/workflowGraphStore";
import BaseButton from "./primitives/BaseButton.vue";
import BaseInput from "./primitives/BaseInput.vue";
import BaseSurface from "./primitives/BaseSurface.vue";
import BaseTypography from "./primitives/BaseTypography.vue";
import WorkflowArrayConfigField from "./workflowConfig/WorkflowArrayConfigField.vue";
import WorkflowJsonConfigField from "./workflowConfig/WorkflowJsonConfigField.vue";

const workflowGraphStore = useWorkflowGraphStore();

const selectedNode = computed(() => workflowGraphStore.selectedNode);
const selectedNodeDefinition = computed(
  () => workflowGraphStore.selectedNodeDefinition,
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
  workflowGraphStore.updateConfigOfNodeById(selectedNode.value.id, key, value);
}

function getStringFieldValue(fieldKey: string): string {
  const value = workNode.value?.config[fieldKey];
  return value == null ? "" : String(value);
}

function getArrayEntries(key: string): Record<string, unknown>[] {
  const rawValue = workNode.value?.config[key];
  return Array.isArray(rawValue) ? (rawValue as Record<string, unknown>[]) : [];
}

function buildConfigFieldControlId(fieldKey: string): string {
  return `node-config-${workNode.value?.id ?? "unknown-node"}-${fieldKey}`;
}
</script>

<template>
  <BaseSurface
    as="aside"
    variant="outlined"
    padding="none"
    class="config-panel"
  >
    <template v-if="selectedNode && workNode && selectedNodeDefinition">
      <div class="panel-header">
        <span class="panel-icon">{{ selectedNodeDefinition.icon }}</span>
        <BaseTypography as="h3" variant="headingSmall" class="panel-title">
          {{ selectedNodeDefinition.label }} Config
        </BaseTypography>
        <BaseButton
          variant="ghost"
          size="small"
          accessible-label="Close node configuration panel"
          @click="workflowGraphStore.setSelectedNode(null)"
        >
          ✕
        </BaseButton>
      </div>

      <div class="panel-body">
        <div class="field-group">
          <BaseTypography
            as="label"
            variant="caption"
            tone="secondary"
            class="field-label"
            :for="buildConfigFieldControlId('node-id')"
          >
            Node ID
          </BaseTypography>
          <BaseInput
            :model-value="workNode.id"
            :is-disabled="true"
            :control-id="buildConfigFieldControlId('node-id')"
          />
        </div>

        <template v-for="field in configSchema" :key="field.key">
          <div v-if="isFieldVisible(field)" class="field-group">
            <BaseTypography
              as="label"
              variant="caption"
              tone="secondary"
              class="field-label"
              :for="buildConfigFieldControlId(field.key)"
            >
              {{ field.label }}
            </BaseTypography>

            <BaseInput
              v-if="field.fieldType === 'text'"
              :model-value="getStringFieldValue(field.key)"
              :placeholder="field.placeholder"
              :control-id="buildConfigFieldControlId(field.key)"
              @update:model-value="onFieldChange(field.key, $event)"
            />

            <BaseInput
              v-else-if="field.fieldType === 'number'"
              input-type="number"
              :model-value="getStringFieldValue(field.key)"
              :placeholder="field.placeholder"
              :control-id="buildConfigFieldControlId(field.key)"
              @update:model-value="onFieldChange(field.key, Number($event))"
            />

            <BaseInput
              v-else-if="field.fieldType === 'select'"
              element-type="select"
              :model-value="getStringFieldValue(field.key)"
              :control-id="buildConfigFieldControlId(field.key)"
              @update:model-value="onFieldChange(field.key, $event)"
            >
              <option
                v-for="option in field.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </BaseInput>

            <WorkflowJsonConfigField
              v-else-if="field.fieldType === 'json'"
              :node-id="workNode.id"
              :field-key="field.key"
              :model-value="workNode.config[field.key]"
              :placeholder="field.placeholder"
              :input-control-id="buildConfigFieldControlId(field.key)"
              @update:model-value="onFieldChange(field.key, $event)"
            />

            <label
              v-else-if="field.fieldType === 'checkbox'"
              class="field-checkbox"
              :for="buildConfigFieldControlId(field.key)"
            >
              <input
                :id="buildConfigFieldControlId(field.key)"
                type="checkbox"
                :checked="workNode.config[field.key] as boolean"
                @change="
                  onFieldChange(
                    field.key,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <BaseTypography as="span" variant="body">
                {{ field.label }}
              </BaseTypography>
            </label>

            <WorkflowArrayConfigField
              v-else-if="field.fieldType === 'array'"
              :field="field"
              :model-value="getArrayEntries(field.key)"
              :field-control-id-prefix="buildConfigFieldControlId(field.key)"
              @update:model-value="onFieldChange(field.key, $event)"
            />
          </div>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="panel-empty">
        <BaseTypography as="p" variant="body" tone="muted">
          👈 Select a node to configure
        </BaseTypography>
      </div>
    </template>
  </BaseSurface>
</template>

<style scoped>
.config-panel {
  width: 320px;
  border-radius: 0;
  border-top: none;
  border-right: none;
  border-bottom: none;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border-default);
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  flex: 1;
}

.panel-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-label {
  letter-spacing: 0.04em;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: var(--space-4);
}

@media (max-width: 1023px) {
  .config-panel {
    width: 280px;
  }
}

@media (max-width: 767px) {
  .config-panel {
    width: 100%;
    max-height: 45vh;
    border-left: none;
    border-top: 1px solid var(--color-border-default);
  }
}
</style>
