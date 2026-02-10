<script setup lang="ts">
import { computed } from "vue";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface BaseButtonProps {
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
}

const properties = withDefaults(defineProps<BaseButtonProps>(), {
  type: "button",
  variant: "secondary",
  size: "medium",
  isLoading: false,
  isDisabled: false,
});

const isButtonDisabled = computed(
  () => properties.isLoading || properties.isDisabled,
);
const buttonClassNames = computed(() => [
  "base-button",
  `base-button--${properties.variant}`,
  `base-button--${properties.size}`,
]);
</script>

<template>
  <button
    :type="properties.type"
    :disabled="isButtonDisabled"
    :class="buttonClassNames"
  >
    <slot v-if="!properties.isLoading" />
    <span v-else class="base-button-loading-content">Loading...</span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-medium);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: var(--font-weight-medium);
}

.base-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.base-button--small {
  min-height: var(--size-control-small);
  padding: 0 var(--space-3);
  font-size: var(--font-size-body-small);
}

.base-button--medium {
  min-height: var(--size-control-medium);
  padding: 0 var(--space-4);
  font-size: var(--font-size-body-medium);
}

.base-button--large {
  min-height: var(--size-control-large);
  padding: 0 var(--space-5);
  font-size: var(--font-size-body-large);
}

.base-button--primary {
  background: var(--color-accent-primary);
  color: #ffffff;
}

.base-button--primary:hover:not(:disabled) {
  background: var(--color-accent-strong);
}

.base-button--secondary {
  background: var(--color-surface-secondary);
  border-color: var(--color-border-default);
  color: var(--color-text-primary);
}

.base-button--secondary:hover:not(:disabled) {
  background: var(--color-surface-primary);
  border-color: var(--color-border-strong);
}

.base-button--danger {
  background: var(--color-danger-primary);
  color: #ffffff;
}

.base-button--danger:hover:not(:disabled) {
  filter: brightness(0.95);
}

.base-button--ghost {
  background: transparent;
  border-color: var(--color-border-default);
  color: var(--color-text-primary);
}

.base-button--ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-surface-primary) 70%, transparent);
}

.base-button-loading-content {
  opacity: 0.9;
}
</style>
