<script setup lang="ts">
import type { PortDefinition } from '../../models/ports'
import DynamicHandleRenderer from './DynamicHandleRenderer.vue'

const props = defineProps<{
  data: {
    workNode: { type: string; config: Record<string, unknown> }
    portDefinition: PortDefinition
  }
}>()

function caseCount(): number {
  const cases = props.data.workNode.config.cases as unknown[]
  return Array.isArray(cases) ? cases.length : 0
}
</script>

<template>
  <div class="node-renderer node-switch">
    <div class="node-header">🔀 Switch</div>
    <div class="node-body">
      <span class="node-preview">{{ data.workNode.config.targetField || '—' }} · {{ caseCount() }} cases</span>
    </div>
    <DynamicHandleRenderer :portDefinition="data.portDefinition" />
  </div>
</template>

<style scoped>
.node-switch {
  border-left: 4px solid #8b5cf6;
  min-height: 60px;
}
</style>
