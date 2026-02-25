<script setup lang="ts">
import { computed } from "vue";

type InputElementType = "input" | "textarea" | "select";
type InputVisualState = "default" | "error";
type InputSize = "small" | "medium" | "large";

interface BaseInputProps {
  modelValue?: string | number;
  elementType?: InputElementType;
  inputType?: string;
  controlId?: string;
  accessibleLabel?: string;
  describedById?: string;
  isRequired?: boolean;
  hasValidationError?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
  min?: number;
  max?: number;
  state?: InputVisualState;
  size?: InputSize;
}

const properties = withDefaults(defineProps<BaseInputProps>(), {
  modelValue: "",
  elementType: "input",
  inputType: "text",
  controlId: undefined,
  accessibleLabel: undefined,
  describedById: undefined,
  isRequired: false,
  hasValidationError: false,
  placeholder: "",
  isDisabled: false,
  min: undefined,
  max: undefined,
  state: "default",
  size: "medium",
});

const emit = defineEmits<{
  (eventName: "update:modelValue", value: string): void;
}>();

const inputClassNames = computed(() => [
  "base-input",
  `base-input--${properties.state}`,
  `base-input--${properties.size}`,
]);
const isValidationError = computed(
  () => properties.hasValidationError || properties.state === "error",
);

function emitInputValue(event: Event) {
  const target = event.target as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <component
    :is="properties.elementType"
    :type="
      properties.elementType === 'input' ? properties.inputType : undefined
    "
    :id="properties.controlId"
    :class="inputClassNames"
    :aria-label="properties.accessibleLabel"
    :aria-describedby="properties.describedById"
    :aria-invalid="isValidationError || undefined"
    :required="properties.isRequired"
    :placeholder="properties.placeholder"
    :value="properties.modelValue"
    :min="properties.min"
    :max="properties.max"
    :disabled="properties.isDisabled"
    @input="emitInputValue"
    @change="emitInputValue"
  >
    <slot />
  </component>
</template>

<style scoped>
.base-input {
  width: 100%;
  background: var(--color-surface-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-medium);
  color: var(--color-text-primary);
  outline: 2px solid transparent;
  outline-offset: 1px;
  transition: border-color 0.15s ease;
}

.base-input::placeholder {
  color: var(--color-text-muted);
}

.base-input:focus-visible {
  border-color: var(--color-accent-primary);
  outline-color: var(--color-accent-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent-primary) 28%, transparent);
}

.base-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-input--small {
  min-height: var(--size-control-small);
  padding: 0 var(--space-3);
  font-size: var(--font-size-body-small);
}

.base-input--medium {
  min-height: var(--size-control-medium);
  padding: 0 var(--space-3);
  font-size: var(--font-size-body-medium);
}

.base-input--large {
  min-height: var(--size-control-large);
  padding: 0 var(--space-4);
  font-size: var(--font-size-body-large);
}

.base-input--error {
  border-color: var(--color-danger-primary);
}

textarea.base-input {
  min-height: 80px;
  padding: var(--space-2) var(--space-3);
  resize: vertical;
}

select.base-input {
  cursor: pointer;
}
</style>
