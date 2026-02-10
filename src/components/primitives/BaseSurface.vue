<script setup lang="ts">
import { computed } from "vue";

type SurfaceVariant = "default" | "outlined" | "elevated";
type SurfacePadding = "none" | "small" | "medium" | "large";

interface BaseSurfaceProps {
  as?: string;
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
}

const properties = withDefaults(defineProps<BaseSurfaceProps>(), {
  as: "div",
  variant: "default",
  padding: "medium",
});

const surfaceClassNames = computed(() => [
  "base-surface",
  `base-surface--${properties.variant}`,
  `base-surface--padding-${properties.padding}`,
]);
</script>

<template>
  <component :is="properties.as" :class="surfaceClassNames">
    <slot />
  </component>
</template>

<style scoped>
.base-surface {
  background: var(--color-surface-primary);
  border-radius: var(--radius-medium);
  border: 1px solid var(--color-border-default);
}

.base-surface--default {
  box-shadow: var(--elevation-level-0);
}

.base-surface--outlined {
  box-shadow: var(--elevation-level-0);
}

.base-surface--elevated {
  box-shadow: var(--elevation-level-1);
}

.base-surface--padding-none {
  padding: 0;
}

.base-surface--padding-small {
  padding: var(--space-2);
}

.base-surface--padding-medium {
  padding: var(--space-3);
}

.base-surface--padding-large {
  padding: var(--space-4);
}
</style>
