<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseInput from '../primitives/BaseInput.vue'
import BaseTypography from '../primitives/BaseTypography.vue'

interface WorkflowJsonConfigFieldProps {
  nodeId: string
  fieldKey: string
  modelValue: unknown
  placeholder?: string
  inputControlId?: string
}

const properties = defineProps<WorkflowJsonConfigFieldProps>()

const emit = defineEmits<{
  (eventName: 'update:modelValue', value: unknown): void
}>()

const LOCAL_VALIDATION_MESSAGES = {
  invalidJson: 'Invalid JSON. Check syntax and try again.',
} as const

const jsonTextDraftValue = ref(formatJsonValue(properties.modelValue))
const jsonValidationErrorMessage = ref('')
const jsonValidationErrorMessageId = `${properties.inputControlId ?? `${properties.nodeId}-${properties.fieldKey}`}-json-error`

watch(() => [properties.nodeId, properties.fieldKey, properties.modelValue], () => {
  if (jsonValidationErrorMessage.value) {
    return
  }

  jsonTextDraftValue.value = formatJsonValue(properties.modelValue)
}, { deep: true })

function onJsonInputValueChange(rawValue: string): void {
  jsonTextDraftValue.value = rawValue

  try {
    const parsedValue = JSON.parse(rawValue)
    jsonValidationErrorMessage.value = ''
    emit('update:modelValue', parsedValue)
  } catch {
    jsonValidationErrorMessage.value = LOCAL_VALIDATION_MESSAGES.invalidJson
  }
}

function formatJsonValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <BaseInput
    element-type="textarea"
    class="field-json-input"
    :model-value="jsonTextDraftValue"
    :placeholder="properties.placeholder"
    :control-id="properties.inputControlId"
    :described-by-id="jsonValidationErrorMessage ? jsonValidationErrorMessageId : undefined"
    :has-validation-error="Boolean(jsonValidationErrorMessage)"
    :state="jsonValidationErrorMessage ? 'error' : 'default'"
    @update:model-value="onJsonInputValueChange"
  />
  <BaseTypography
    v-if="jsonValidationErrorMessage"
    as="p"
    variant="caption"
    tone="danger"
    class="json-error-message"
    :id="jsonValidationErrorMessageId"
  >
    {{ jsonValidationErrorMessage }}
  </BaseTypography>
</template>

<style scoped>
.field-json-input {
  min-height: 100px;
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-body-small);
}

.json-error-message {
  margin-top: var(--space-1);
}
</style>
