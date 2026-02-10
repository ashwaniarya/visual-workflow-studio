<script setup lang="ts">
import { computed, ref } from "vue";
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@vue-flow/core";
import { useWorkflowCanvasStore } from "../../stores/workflowCanvasStore";

type DeletableEdgeRendererProps = Pick<
  EdgeProps,
  | "id"
  | "sourceX"
  | "sourceY"
  | "targetX"
  | "targetY"
  | "sourcePosition"
  | "targetPosition"
  | "markerEnd"
>;

const props = defineProps<DeletableEdgeRendererProps>();

const workflowStore = useWorkflowCanvasStore();

const isEdgeHovered = ref(false);
const isWorkflowExecutionInProgress = computed(() => workflowStore.isExecuting);

const edgePath = computed(() => {
  return getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });
});

const path = computed(() => edgePath.value[0]);
const labelX = computed(() => edgePath.value[1]);
const labelY = computed(() => edgePath.value[2]);

function handleDeleteEdge() {
  workflowStore.removeEdge(props.id);
}
</script>

<template>
  <!-- Invisible wider path for easy hover detection -->
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    :stroke-width="20"
    @mouseenter="isEdgeHovered = true"
    @mouseleave="isEdgeHovered = false"
  />

  <!-- Visible edge path (animates only during execution) -->
  <path
    :d="path"
    fill="none"
    stroke="#45475a"
    :stroke-width="1.5"
    :marker-end="markerEnd"
    class="vue-flow__edge-path"
    :class="{
      'edge-hovered': isEdgeHovered,
      'edge-execution-animated': isWorkflowExecutionInProgress,
    }"
    style="pointer-events: none"
  />

  <EdgeLabelRenderer>
    <div
      class="edge-delete-button-container"
      :class="{ 'edge-delete-visible': isEdgeHovered }"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all',
      }"
      @mouseenter="isEdgeHovered = true"
      @mouseleave="isEdgeHovered = false"
    >
      <button
        class="edge-delete-button"
        @click.stop="handleDeleteEdge"
        title="Delete edge"
      >
        ✕
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<style>
/* Unscoped — EdgeLabelRenderer renders outside component tree */

.edge-hovered {
  stroke: #f38ba8 !important;
}

.edge-execution-animated {
  stroke-dasharray: 6 4;
  animation: execution-edge-flow 0.8s linear infinite;
}

@keyframes execution-edge-flow {
  to {
    stroke-dashoffset: -10;
  }
}

.edge-delete-button-container {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.edge-delete-button-container.edge-delete-visible {
  opacity: 1;
}

.edge-delete-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #45475a;
  background: #1e1e2e;
  color: #f38ba8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.edge-delete-button:hover {
  background: #f38ba8;
  color: #1e1e2e;
  border-color: #f38ba8;
}
</style>
