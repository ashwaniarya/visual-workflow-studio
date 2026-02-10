<script setup lang="ts">
import { computed } from "vue";

type TypographyVariant =
  | "headingLarge"
  | "headingMedium"
  | "headingSmall"
  | "body"
  | "caption"
  | "micro";
type TypographyTone =
  | "primary"
  | "secondary"
  | "muted"
  | "accent"
  | "danger"
  | "success";

interface BaseTypographyProps {
  as?: string;
  variant?: TypographyVariant;
  tone?: TypographyTone;
}

const properties = withDefaults(defineProps<BaseTypographyProps>(), {
  as: "span",
  variant: "body",
  tone: "primary",
});

const typographyClassNames = computed(() => [
  "base-typography",
  `base-typography--${properties.variant}`,
  `base-typography--${properties.tone}`,
]);
</script>

<template>
  <component :is="properties.as" :class="typographyClassNames">
    <slot />
  </component>
</template>

<style scoped>
.base-typography {
  margin: 0;
  line-height: var(--line-height-normal);
}

.base-typography--headingLarge {
  font-size: var(--font-size-heading-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.base-typography--headingMedium {
  font-size: var(--font-size-heading-medium);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.base-typography--headingSmall {
  font-size: var(--font-size-heading-small);
  font-weight: var(--font-weight-semibold);
}

.base-typography--body {
  font-size: var(--font-size-body-medium);
  font-weight: var(--font-weight-medium);
}

.base-typography--caption {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.base-typography--micro {
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.base-typography--primary {
  color: var(--color-text-primary);
}

.base-typography--secondary {
  color: var(--color-text-secondary);
}

.base-typography--muted {
  color: var(--color-text-muted);
}

.base-typography--accent {
  color: var(--color-accent-primary);
}

.base-typography--danger {
  color: var(--color-danger-primary);
}

.base-typography--success {
  color: var(--color-success-primary);
}
</style>
