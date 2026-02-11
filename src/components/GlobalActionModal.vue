<script setup lang="ts">
import { computed } from "vue";
import { useGlobalUIStore } from "../stores/globalUIStore";
import BaseButton from "./primitives/BaseButton.vue";
import BaseTypography from "./primitives/BaseTypography.vue";

const globalUIStore = useGlobalUIStore();

const activeModal = computed(() => globalUIStore.activeModal);
const hasActiveModal = computed(() => Boolean(activeModal.value));
const activeModalActionEntries = computed(() =>
  activeModal.value ? Object.entries(activeModal.value.actionButtonMap) : [],
);
const isAnyModalActionRunning = computed(
  () => globalUIStore.activeModalActionKey !== null,
);

function onModalActionClicked(actionKey: string) {
  globalUIStore.runModalActionByKey(actionKey);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="hasActiveModal" class="global-modal-backdrop">
      <div
        class="global-modal-content"
        role="dialog"
        aria-modal="true"
        :aria-label="activeModal?.title"
      >
        <BaseTypography as="h3" variant="headingSmall">
          {{ activeModal?.title }}
        </BaseTypography>
        <BaseTypography as="p" variant="body" tone="muted">
          {{ activeModal?.message }}
        </BaseTypography>

        <div class="global-modal-actions">
          <BaseButton
            v-for="[actionKey, actionDefinition] in activeModalActionEntries"
            :key="actionKey"
            :variant="actionDefinition.buttonVariant"
            size="small"
            :is-disabled="isAnyModalActionRunning"
            @click="onModalActionClicked(actionKey)"
          >
            {{ actionDefinition.buttonLabel }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.global-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-background-primary) 55%, transparent);
}

.global-modal-content {
  width: min(420px, 100%);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-large);
  background: var(--color-surface-primary);
  box-shadow: 0 12px 30px color-mix(in srgb, black 28%, transparent);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.global-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
