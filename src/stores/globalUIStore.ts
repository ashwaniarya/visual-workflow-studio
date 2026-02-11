import { defineStore } from "pinia";

type ModalButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ModalActionDecision = "dismiss" | "keep-open";

interface ModalActionDefinition {
  buttonLabel: string;
  buttonVariant: ModalButtonVariant;
  callback: () => ModalActionDecision | Promise<ModalActionDecision>;
}

interface GlobalModalState {
  title: string;
  message: string;
  actionButtonMap: Record<string, ModalActionDefinition>;
}

interface GlobalUIState {
  activeModal: GlobalModalState | null;
  activeModalActionKey: string | null;
}

export const useGlobalUIStore = defineStore("globalUI", {
  state: (): GlobalUIState => ({
    activeModal: null,
    activeModalActionKey: null,
  }),

  actions: {
    openModal(modalState: GlobalModalState) {
      this.activeModal = modalState;
      this.activeModalActionKey = null;
    },

    closeModal() {
      this.activeModal = null;
      this.activeModalActionKey = null;
    },

    async runModalActionByKey(actionKey: string) {
      if (!this.activeModal || this.activeModalActionKey) {
        return;
      }

      const modalActionDefinition = this.activeModal.actionButtonMap[actionKey];
      if (!modalActionDefinition) {
        return;
      }

      this.activeModalActionKey = actionKey;
      try {
        const modalActionDecision = await modalActionDefinition.callback();
        if (modalActionDecision === "dismiss") {
          this.closeModal();
        }
      } catch (error) {
        console.error("Global modal action execution failed", error);
      } finally {
        if (this.activeModal) {
          this.activeModalActionKey = null;
        }
      }
    },
  },
});
