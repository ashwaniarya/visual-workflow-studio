<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { computed } from "vue";
import { useWorkflowGraphStore } from "../stores/workflowGraphStore";
import { getNodeDefinition } from "../registry/nodeRegistry";
import { createWorkNode } from "../factory/workNodeFactory";
import type { RenderWorkNode } from "../models/renderWorkNode";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node as VueFlowNode,
  NodeChange,
} from "@vue-flow/core";
import { canConnect } from "../engine/workflowEngine";
import { WORKFLOW_CONSTANTS } from "../config/workflowConstants";

import StartNodeRenderer from "./nodeRenderers/StartNodeRenderer.vue";
import TransformNodeRenderer from "./nodeRenderers/TransformNodeRenderer.vue";
import IfElseNodeRenderer from "./nodeRenderers/IfElseNodeRenderer.vue";
import SwitchNodeRenderer from "./nodeRenderers/SwitchNodeRenderer.vue";
import EndNodeRenderer from "./nodeRenderers/EndNodeRenderer.vue";
import DeletableEdgeRenderer from "./edgeRenderers/DeletableEdgeRenderer.vue";
import WorkflowMiniMapPanel from "./WorkflowMiniMapPanel.vue";

const workflowGraphStore = useWorkflowGraphStore();
const canvasNodes = computed<VueFlowNode[]>(() => [
  ...workflowGraphStore.nodes,
]);
const canvasEdges = computed<Edge[]>(() => [...workflowGraphStore.edges]);
const { onConnect, onNodeClick, onNodesChange, onEdgesChange, project } =
  useVueFlow();

let nodeIdCounter = 0;

function generateNodeId(): string {
  nodeIdCounter++;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

// ─── Drop handler ────────────────────────────────────────────────────

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const nodeType = event.dataTransfer?.getData(
    "application/workflow-node-type",
  );
  if (!nodeType) return;

  const definition = getNodeDefinition(nodeType);
  const newId = generateNodeId();
  const workNode = createWorkNode(newId, definition);

  const canvasElement = (
    event.currentTarget as HTMLElement
  )?.getBoundingClientRect();
  const position = project({
    x: event.clientX - canvasElement.left,
    y: event.clientY - canvasElement.top,
  });

  const renderNode: RenderWorkNode = {
    id: newId,
    type: nodeType,
    position: { x: position.x, y: position.y },
    data: { workNode, portDefinition: definition.portDefinition },
  };

  workflowGraphStore.addNode(renderNode);
}

// ─── Connection handler ──────────────────────────────────────────────

onConnect((connection: Connection) => {
  const isValid = canConnect(
    connection.source,
    connection.sourceHandle ?? "out-0",
    connection.target,
    workflowGraphStore.nodes,
    workflowGraphStore.edges,
  );
  if (!isValid) return;

  const edge: Edge = {
    id: `edge-${connection.source}-${connection.sourceHandle}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
  };
  workflowGraphStore.addEdge(edge);
});

onNodesChange((nodeChanges: NodeChange[]) => {
  workflowGraphStore.applyNodeChanges(nodeChanges);
});

onEdgesChange((edgeChanges: EdgeChange[]) => {
  workflowGraphStore.applyEdgeChanges(edgeChanges);
});

// ─── Node click handler ─────────────────────────────────────────────

onNodeClick(({ node }) => {
  workflowGraphStore.setSelectedNode(node.id);
});

function onPaneClick() {
  workflowGraphStore.setSelectedNode(null);
}

function onMoveEnd(event: {
  flowTransform: { x: number; y: number; zoom: number };
}) {
  if (!WORKFLOW_CONSTANTS.PERSIST_CANVAS_VIEWPORT) return;
  workflowGraphStore.updateCanvasViewport(event.flowTransform);
}

function onVueFlowInit(flowInstance: {
  setViewport: (v: { x: number; y: number; zoom: number }) => void;
}) {
  const viewport = workflowGraphStore.canvasViewport;
  if (viewport) {
    flowInstance.setViewport(viewport);
  }
}
</script>

<template>
  <div class="workflow-canvas" @dragover="onDragOver" @drop="onDrop">
    <VueFlow
      :nodes="canvasNodes"
      :edges="canvasEdges"
      :min-zoom="WORKFLOW_CONSTANTS.MIN_ZOOM"
      :max-zoom="WORKFLOW_CONSTANTS.MAX_ZOOM"
      :default-zoom="WORKFLOW_CONSTANTS.DEFAULT_CANVAS_ZOOM"
      @pane-click="onPaneClick"
      @move-end="onMoveEnd"
      @init="onVueFlowInit"
    >
      <template #node-START="nodeProps">
        <StartNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-TRANSFORM="nodeProps">
        <TransformNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-IFELSE="nodeProps">
        <IfElseNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-SWITCH="nodeProps">
        <SwitchNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-END="nodeProps">
        <EndNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>

      <template #edge-DELETABLE="edgeProps">
        <DeletableEdgeRenderer
          :id="edgeProps.id"
          :source-x="edgeProps.sourceX"
          :source-y="edgeProps.sourceY"
          :target-x="edgeProps.targetX"
          :target-y="edgeProps.targetY"
          :source-position="edgeProps.sourcePosition"
          :target-position="edgeProps.targetPosition"
          :marker-end="edgeProps.markerEnd"
        />
      </template>

      <Background />
      <WorkflowMiniMapPanel />
      <Controls />
    </VueFlow>
  </div>
</template>

<style scoped>
.workflow-canvas {
  flex: 1;
  height: 100%;
  position: relative;
}
</style>
