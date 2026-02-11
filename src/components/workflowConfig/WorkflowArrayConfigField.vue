<script setup lang="ts">
import type { ConfigFieldDefinition } from '../../models/configSchema'
import BaseButton from '../primitives/BaseButton.vue'
import BaseInput from '../primitives/BaseInput.vue'
import BaseSurface from '../primitives/BaseSurface.vue'
import BaseTypography from '../primitives/BaseTypography.vue'

interface WorkflowArrayConfigFieldProps {
  field: ConfigFieldDefinition
  modelValue: Record<string, unknown>[]
  fieldControlIdPrefix?: string
}

const properties = defineProps<WorkflowArrayConfigFieldProps>()

const emit = defineEmits<{
  (eventName: 'update:modelValue', value: Record<string, unknown>[]): void
}>()

function onArrayEntryFieldChange(entryIndex: number, fieldKey: string, value: unknown): void {
  const updatedEntries = [...properties.modelValue]
  updatedEntries[entryIndex] = { ...updatedEntries[entryIndex], [fieldKey]: value }
  emit('update:modelValue', updatedEntries)
}

function addArrayEntry(): void {
  const updatedEntries = [...properties.modelValue]
  const newEntry: Record<string, unknown> = {}

  for (const itemField of properties.field.itemFields ?? []) {
    newEntry[itemField.key] = itemField.defaultValue ?? ''
  }

  updatedEntries.push(newEntry)
  emit('update:modelValue', updatedEntries)
}

function removeArrayEntry(entryIndex: number): void {
  const updatedEntries = [...properties.modelValue]
  updatedEntries.splice(entryIndex, 1)
  emit('update:modelValue', updatedEntries)
}

function buildArrayEntryFieldControlId(entryIndex: number, itemFieldKey: string): string {
  if (!properties.fieldControlIdPrefix) {
    return `${properties.field.key}-${entryIndex}-${itemFieldKey}`
  }
  return `${properties.fieldControlIdPrefix}-${entryIndex}-${itemFieldKey}`
}
</script>

<template>
  <template v-if="properties.field.itemFields">
    <BaseSurface
      v-for="(entry, entryIndex) in properties.modelValue"
      :key="`${properties.field.key}-${entryIndex}`"
      as="div"
      variant="outlined"
      padding="medium"
      class="array-entry-card"
    >
      <div class="array-entry-header">
        <BaseTypography as="span" variant="caption" tone="muted">
          #{{ entryIndex + 1 }}
        </BaseTypography>
        <BaseButton
          variant="ghost"
          size="small"
          :accessible-label="`Remove ${properties.field.label} entry ${entryIndex + 1}`"
          @click="removeArrayEntry(entryIndex)"
        >
          ✕
        </BaseButton>
      </div>

      <div
        v-for="itemField in properties.field.itemFields"
        :key="`${properties.field.key}-${entryIndex}-${itemField.key}`"
        class="array-item-field"
      >
        <BaseTypography
          as="label"
          variant="caption"
          tone="secondary"
          class="field-label"
          :for="buildArrayEntryFieldControlId(entryIndex, itemField.key)"
        >
          {{ itemField.label }}
        </BaseTypography>

        <BaseInput
          v-if="itemField.fieldType === 'text'"
          :model-value="String((entry as Record<string, unknown>)[itemField.key] ?? '')"
          :placeholder="itemField.placeholder"
          :control-id="buildArrayEntryFieldControlId(entryIndex, itemField.key)"
          @update:model-value="onArrayEntryFieldChange(entryIndex, itemField.key, $event)"
        />

        <BaseInput
          v-else-if="itemField.fieldType === 'number'"
          input-type="number"
          :model-value="String((entry as Record<string, unknown>)[itemField.key] ?? '')"
          :placeholder="itemField.placeholder"
          :control-id="buildArrayEntryFieldControlId(entryIndex, itemField.key)"
          @update:model-value="onArrayEntryFieldChange(entryIndex, itemField.key, Number($event))"
        />

        <BaseInput
          v-else-if="itemField.fieldType === 'select'"
          element-type="select"
          :model-value="String((entry as Record<string, unknown>)[itemField.key] ?? '')"
          :control-id="buildArrayEntryFieldControlId(entryIndex, itemField.key)"
          @update:model-value="onArrayEntryFieldChange(entryIndex, itemField.key, $event)"
        >
          <option v-for="option in itemField.options" :key="option" :value="option">
            {{ option }}
          </option>
        </BaseInput>
      </div>
    </BaseSurface>

    <BaseButton variant="secondary" size="small" class="array-add-button" @click="addArrayEntry">
      + Add {{ properties.field.label?.replace(/s$/, '') || 'Entry' }}
    </BaseButton>
  </template>
</template>

<style scoped>
.field-label {
  letter-spacing: 0.04em;
}

.array-entry-card {
  margin-bottom: var(--space-2);
}

.array-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.array-item-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.array-add-button {
  width: 100%;
}
</style>
