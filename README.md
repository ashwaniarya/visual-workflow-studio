# Project Overview

Visual Workflow Studio is a visual DAG editor built with Vue 3 and TypeScript. You drag nodes onto a canvas, connect them into a workflow, configure behavior per node, and run the flow to inspect execution logs step by step.

Today the built-in node types are `START`, `TRANSFORM`, `DECISION`, `SWITCH`, and `END`. The execution engine moves through the graph by following the output port selected by each node executor. Workflows can be exported/imported as JSON, and canvas state is autosaved locally.

# Setup

## Prerequisites

- Node.js 20+
- npm 10+

## Install and run

```bash
npm install
npm run dev
```

## Build, preview, and test

```bash
npm run build
npm run preview
npm run test
```

# Architectural

At a high level, the canvas drives graph mutations, graph state feeds execution and persistence, and node behavior is resolved through registry + factory + executor strategy:

```mermaid
flowchart LR
  UserActions[UserActions] --> CanvasUI[WorkFlowCanvas]
  CanvasUI --> NodeRegistry[nodeRegistry]
  NodeRegistry --> WorkNodeFactory[workNodeFactory]
  WorkNodeFactory --> RenderNode[RenderWorkNode]
  CanvasUI --> GraphStore[workflowGraphStore]
  GraphStore --> HistoryStore[workflowHistoryStore]
  GraphStore --> PersistenceStore[workflowPersistenceStore]
  GraphStore --> ExecutionStore[workflowExecutionStore]
  ExecutionStore --> WorkflowEngine[workflowEngine]
  WorkflowEngine --> NodeExecutors[NodeExecutors]
```

Project structure and key components:

- `src/components/`
  - `WorkFlowCanvas.vue`: drag/drop, connect, node/edge change streams.
  - `nodeRenderers/*`: node visual contracts per type.
  - `edgeRenderers/*`: edge-level controls (for example delete edge interaction).
- `src/stores/`
  - `workflowGraphStore.ts`: graph domain state + normalized indexes.
  - `workflowHistoryStore.ts`: command history, undo/redo lifecycle.
  - `workflowPersistenceStore.ts`: autosave, import/export, restore.
  - `workflowExecutionStore.ts`: runtime execution log + node execution states.
- `src/engine/`
  - `workflowEngine.ts`: validation rules, DAG build, execution loop.
  - `executors/*`: specialized execution strategies.
- `src/registry/nodeRegistry.ts`
  - node definitions, config schema, `executorResolver`, optional `portResolver`.
- `src/factory/workNodeFactory.ts`
  - creates work nodes from registry definitions.
- `src/config/workflowConstants.ts`
  - centralized limits and policy flags.

# UI Component Design and Minimal Design System

The UI follows layered composition so behavior and presentation can evolve without rewriting the complete workflow surface.

```mermaid
flowchart TB
  AppShell[AppShell] --> WorkflowPage[WorkflowPage]
  WorkflowPage --> WorkFlowCanvas[WorkFlowCanvas]
  WorkflowPage --> NodeConfigPanel[NodeConfigPanel]
  WorkflowPage --> ExecutionLogPanel[ExecutionLogPanel]
  WorkFlowCanvas --> NodeRendererWrapper[NodeRendererWrapper]
  NodeRendererWrapper --> StartNodeRenderer[StartNodeRenderer]
  NodeRendererWrapper --> TransformNodeRenderer[TransformNodeRenderer]
  NodeRendererWrapper --> DecisionNodeRenderer[DecisionNodeRenderer]
  NodeRendererWrapper --> SwitchNodeRenderer[SwitchNodeRenderer]
  NodeRendererWrapper --> EndNodeRenderer[EndNodeRenderer]
  WorkFlowCanvas --> DeletableEdgeRenderer[DeletableEdgeRenderer]
```

Component boundaries:

- `WorkFlowCanvas` handles canvas-level interactions (drag/drop, connect, selection, and change streams).
- Node renderers handle node-specific visuals and interactions.
- `DeletableEdgeRenderer` handles edge-local actions.
- Configuration UI handles schema-driven editing of node config.
- Execution log UI handles runtime visibility and error feedback.

Minimal design system principles:

- Use a compact token set for spacing, radius, typography, and semantic colors.
- Keep interaction states explicit: normal, hover, selected, executing, success, and error.
- Reuse semantic tokens first, then add new values only when a clear new role appears.
- Keep visual rules consistent across node and edge surfaces.

Accessibility baseline:

- Visible keyboard focus for interactive controls.
- High contrast for selected/error/success states.
- Comfortable interaction targets for delete and edge actions.

Pros and cons of this minimal system:

- ✅ Pros: faster UI extension, visual consistency, easier theme evolution.
- ⚠️ Cons: token governance is required to avoid style drift.

## Low Level Design

In low level design I am covering only key flows.

### Workflow runtime flow

```mermaid
sequenceDiagram
  participant Palette as NodePalette
  participant Canvas as WorkFlowCanvas
  participant Registry as nodeRegistry
  participant Factory as workNodeFactory
  participant Graph as workflowGraphStore
  participant Engine as workflowEngine

  Palette->>Canvas: DragNodeType
  Canvas->>Registry: getNodeDefinition(type)
  Canvas->>Factory: createWorkNode(id, definition)
  Canvas->>Graph: addNode(renderWorkNode)
  Graph->>Engine: executeWorkflow(nodes, edges)
  Engine->>Engine: getExecutor().execute()
  Engine->>Graph: executionLogAndNodeStateMap
```

### How node generation works

Node generation follows a small pipeline:

1. Canvas receives a node type from drag/drop.
2. Registry returns a `NodeDefinition`.
3. Factory creates a `workNode` instance with default config.
4. UI wraps it as `RenderWorkNode` (with live port definition) and inserts it into graph state.

[`NodeDefinition`](src/registry/nodeRegistry.ts) is the key extension contract. It contains default config, schema for config UI, port metadata, and [`executorResolver(config)`](src/registry/nodeRegistry.ts). For dynamic branching nodes (like `SWITCH`), [`portResolver(config)`](src/registry/nodeRegistry.ts) can recalculate output ports at runtime.

### Why this makes new WorkNodes easy to add

To add a new node type, you usually only touch four places:

1. Register the node definition in `src/registry/nodeRegistry.ts`.
2. Implement executor behavior in `src/engine/executors/`.
3. Add a node renderer in `src/components/nodeRenderers/`.
4. Wire the renderer slot in `src/components/WorkFlowCanvas.vue`.

Pros and cons:

- ✅ Pros: strong separation of concerns, better extensibility, node-specific behavior stays local.
- ⚠️ Cons: a bit more moving pieces, and new contributors need to learn the registry/factory/executor contract.

# State Management

State is split across Pinia stores by responsibility:

- `workflowGraphStore`: graph nodes/edges, adjacency indexes, selection, and graph mutation primitives.
- `workflowHistoryStore`: command history lifecycle (`run`, `undo`, `redo`) with bounded depth.
- `workflowPersistenceStore`: autosave scheduling, import/export, and restore from local storage.
- `workflowExecutionStore`: execution lifecycle, execution logs, and per-node execution status.

Interaction shape:

`UI event -> graph command -> history update -> autosave (optional) -> execution state update (when run is triggered)`

This separation keeps each store focused while still allowing them to compose cleanly.

## Performance Consideration

For larger workflows, the graph layer is optimized for targeted updates rather than full collection replacement.

The graph store uses:

- `nodeById: Map<string, RenderWorkNode>`
- `edgeById: Map<string, Edge>`
- `adjacencyByNodeId: Map<string, Set<string>>`

Why this matters:

- Node/edge lookup and incident-edge operations stay fast (O(1) style lookups).
- Dynamic port changes can remove only invalid affected edges instead of filtering every edge.
- `splice` updates preserve top-level array identity, which aligns better with Vue Flow change streams (`applyNodeChanges`, `applyEdgeChanges`).

Pros and cons of this approach:

- ✅ Pros: better scaling behavior for dense workflows and lower reactive fan-out.
- ⚠️ Cons: more index consistency rules to maintain (handled by graph consistency assertions in development).

Hard limits and policy flags are centralized in `src/config/workflowConstants.ts` (for example `MAX_EXECUTION_STEPS`, autosave debounce, undo/redo depth, zoom bounds, and edge validation toggle).

## Code Quality

Code quality is driven by architecture boundaries first, then tests and runtime checks:

- Stores follow clear single-responsibility boundaries.
- Hard-coded runtime values are centralized in `WORKFLOW_CONSTANTS`.
- Workflow import/export is isolated behind serialization/validation boundaries.
- The engine captures execution errors into structured runtime state for renderer feedback.
- Vitest covers important graph, history, and engine behaviors.
