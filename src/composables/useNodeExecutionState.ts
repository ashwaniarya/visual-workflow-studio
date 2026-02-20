import { computed } from 'vue'
import { useWorkflowExecutionStore } from '../stores/workflowExecutionStore'
import type { NodeExecutionState } from '../engine/nodeExecutionState'

// ─── Composable: Node Execution State ────────────────────────────────
// Each renderer calls this with its VueFlow `id` prop.
// Returns reactive executionState + helper CSS class string.

export function useNodeExecutionState(nodeId: string) {
  const workflowExecutionStore = useWorkflowExecutionStore()

  const executionState = computed<NodeExecutionState | undefined>(() => {
    return workflowExecutionStore.nodeExecutionStateMap.get(nodeId)
  })


  const executionCssClass = computed<string>(() => {
    if (!executionState.value) return ''
    return executionState.value.status === 'error'
      ? 'node-execution-error'
      : executionState.value.status === 'success'
        ? 'node-execution-success'
        : ''
  })

  const executionErrorMessage = computed<string | undefined>(() => {
    return executionState.value?.errorMessage
  })

  return {
    executionState,
    executionCssClass,
    executionErrorMessage,
  }
}
