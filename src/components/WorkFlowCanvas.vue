<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { useWorkflowCanvasStore } from "../stores/workflowCanvasStore";
import { getNodeDefinition } from "../registry/nodeRegistry";
import { createWorkNode } from "../factory/workNodeFactory";
import type { RenderWorkNode } from "../models/renderWorkNode";
import type { Connection, Edge, EdgeChange, NodeChange } from "@vue-flow/core";
import { canConnect } from "../engine/workflowEngine";
import { WORKFLOW_CONSTANTS } from "../config/workflowConstants";

import StartNodeRenderer from "./nodeRenderers/StartNodeRenderer.vue";
import TransformNodeRenderer from "./nodeRenderers/TransformNodeRenderer.vue";
import DecisionNodeRenderer from "./nodeRenderers/DecisionNodeRenderer.vue";
import SwitchNodeRenderer from "./nodeRenderers/SwitchNodeRenderer.vue";
import EndNodeRenderer from "./nodeRenderers/EndNodeRenderer.vue";
import DeletableEdgeRenderer from "./edgeRenderers/DeletableEdgeRenderer.vue";
import WorkflowMiniMapPanel from "./WorkflowMiniMapPanel.vue";

const workflowStore = useWorkflowCanvasStore();
const {
  onConnect,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
  onNodeDragStart,
  onNodeDragStop,
  project,
} = useVueFlow({
  nodes: workflowStore.nodes,
  edges: workflowStore.edges,
  minZoom: WORKFLOW_CONSTANTS.MIN_ZOOM,
  maxZoom: WORKFLOW_CONSTANTS.MAX_ZOOM,
  defaultZoom: WORKFLOW_CONSTANTS.DEFAULT_CANVAS_ZOOM,
});

let nodeIdCounter = 0;
const dragStartPositionByNodeId = new Map<string, { x: number; y: number }>();

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

  workflowStore.addNode(renderNode);
}

// ─── Connection handler ──────────────────────────────────────────────

onConnect((connection: Connection) => {
  const isValid = canConnect(
    connection.source,
    connection.sourceHandle ?? "out-0",
    connection.target,
    workflowStore.nodes,
    workflowStore.edges,
  );
  if (!isValid) return;

  const edge: Edge = {
    id: `edge-${connection.source}-${connection.sourceHandle}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    animated: true,
  };
  workflowStore.addEdge(edge);
});

onNodesChange((nodeChanges: NodeChange[]) => {
  workflowStore.applyNodeChanges(nodeChanges);
});

onEdgesChange((edgeChanges: EdgeChange[]) => {
  workflowStore.applyEdgeChanges(edgeChanges);
});

onNodeDragStart(({ node }) => {
  dragStartPositionByNodeId.set(node.id, {
    x: node.position.x,
    y: node.position.y,
  });
});

onNodeDragStop(({ node }) => {
  const dragStartPosition = dragStartPositionByNodeId.get(node.id);
  dragStartPositionByNodeId.delete(node.id);
  if (!dragStartPosition) {
    return;
  }

  const dragEndPosition = {
    x: node.position.x,
    y: node.position.y,
  };
  const hasNodePositionChanged =
    dragStartPosition.x !== dragEndPosition.x ||
    dragStartPosition.y !== dragEndPosition.y;

  if (!hasNodePositionChanged) {
    return;
  }

  workflowStore.recordNodeMoveByBoundaryPositions(
    node.id,
    dragStartPosition,
    dragEndPosition,
  );
});

// ─── Node click handler ─────────────────────────────────────────────

onNodeClick(({ node }) => {
  workflowStore.setSelectedNode(node.id);
});

function onPaneClick() {
  workflowStore.setSelectedNode(null);
}
</script>

<template>
  <div class="workflow-canvas" @dragover="onDragOver" @drop="onDrop">
    <VueFlow
      :nodes="workflowStore.nodes"
      :edges="workflowStore.edges"
      @pane-click="onPaneClick"
    >
      <template #node-START="nodeProps">
        <StartNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-TRANSFORM="nodeProps">
        <TransformNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
      </template>
      <template #node-DECISION="nodeProps">
        <DecisionNodeRenderer :id="nodeProps.id" :data="nodeProps.data" />
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
