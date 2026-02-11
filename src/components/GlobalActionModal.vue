<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
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
const modalDialogReference = ref<HTMLElement | null>(null);
const previousFocusedElementReference = ref<HTMLElement | null>(null);
const LOCAL_MODAL_ACCESSIBILITY_POLICY = {
  titleElementId: "global-modal-title",
  descriptionElementId: "global-modal-description",
  focusableElementSelector:
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
} as const;

function onModalActionClicked(actionKey: string) {
  globalUIStore.runModalActionByKey(actionKey);
}

function getFocusableElementsFromDialog(): HTMLElement[] {
  const dialogElement = modalDialogReference.value;
  if (!dialogElement) {
    return [];
  }

  return Array.from(
    dialogElement.querySelectorAll<HTMLElement>(
      LOCAL_MODAL_ACCESSIBILITY_POLICY.focusableElementSelector,
    ),
  );
}

function focusFirstFocusableElementInDialog() {
  const focusableElements = getFocusableElementsFromDialog();
  const firstFocusableElement = focusableElements[0] ?? modalDialogReference.value;
  firstFocusableElement?.focus();
}

function restoreFocusToPreviousElement() {
  previousFocusedElementReference.value?.focus();
  previousFocusedElementReference.value = null;
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (!hasActiveModal.value) {
    return;
  }

  if (event.key === "Escape" && !isAnyModalActionRunning.value) {
    event.preventDefault();
    globalUIStore.closeModal();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = getFocusableElementsFromDialog();
  if (focusableElements.length === 0) {
    event.preventDefault();
    modalDialogReference.value?.focus();
    return;
  }

  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement as HTMLElement | null;

  if (event.shiftKey && activeElement === firstFocusableElement) {
    event.preventDefault();
    lastFocusableElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastFocusableElement) {
    event.preventDefault();
    firstFocusableElement.focus();
  }
}

watch(hasActiveModal, async (isModalOpen) => {
  if (isModalOpen) {
    previousFocusedElementReference.value = document.activeElement as HTMLElement | null;
    await nextTick();
    focusFirstFocusableElementInDialog();
    document.addEventListener("keydown", onDocumentKeyDown);
    return;
  }

  document.removeEventListener("keydown", onDocumentKeyDown);
  restoreFocusToPreviousElement();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onDocumentKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="hasActiveModal" class="global-modal-backdrop">
      <div
        ref="modalDialogReference"
        class="global-modal-content"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="LOCAL_MODAL_ACCESSIBILITY_POLICY.titleElementId"
        :aria-describedby="LOCAL_MODAL_ACCESSIBILITY_POLICY.descriptionElementId"
      >
        <BaseTypography
          as="h3"
          variant="headingSmall"
          :id="LOCAL_MODAL_ACCESSIBILITY_POLICY.titleElementId"
        >
          {{ activeModal?.title }}
        </BaseTypography>
        <BaseTypography
          as="p"
          variant="body"
          tone="muted"
          :id="LOCAL_MODAL_ACCESSIBILITY_POLICY.descriptionElementId"
        >
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
