<script setup lang="ts">
// Import registry to trigger built-in node registrations on app boot
import "./registry/nodeRegistry";

import AppHeader from "./components/ui/AppHeader.vue";
import WorkFlowToolBar from "./components/WorkFlowToolBar.vue";
import WorkFlowCanvas from "./components/WorkFlowCanvas.vue";
import WorkFlowConfigPanel from "./components/WorkFlowConfigPanel.vue";
import WorkFlowExecutionLog from "./components/WorkFlowExecutionLog.vue";
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <div class="app-body">
      <WorkFlowToolBar />
      <div class="app-center">
        <WorkFlowCanvas />
        <WorkFlowExecutionLog />
      </div>
      <WorkFlowConfigPanel />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #11111b;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
