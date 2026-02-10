<script setup lang="ts">
import { computed } from "vue";

type InputElementType = "input" | "textarea" | "select";
type InputVisualState = "default" | "error";
type InputSize = "small" | "medium" | "large";

interface BaseInputProps {
  modelValue?: string | number;
  elementType?: InputElementType;
  inputType?: string;
  placeholder?: string;
  isDisabled?: boolean;
  state?: InputVisualState;
  size?: InputSize;
}

const properties = withDefaults(defineProps<BaseInputProps>(), {
  modelValue: "",
  elementType: "input",
  inputType: "text",
  placeholder: "",
  isDisabled: false,
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
    :class="inputClassNames"
    :placeholder="properties.placeholder"
    :value="properties.modelValue"
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
  outline: none;
  transition: border-color 0.15s ease;
}

.base-input::placeholder {
  color: var(--color-text-muted);
}

.base-input:focus {
  border-color: var(--color-accent-primary);
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
