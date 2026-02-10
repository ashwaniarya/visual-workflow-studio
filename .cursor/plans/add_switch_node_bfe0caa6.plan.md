---
name: Add SWITCH Node
overview: Build generic dynamic-port infrastructure (array fieldType + portResolver) and ship SWITCH as the first consumer. Each SWITCH case has its own operator+value evaluated against a shared targetField.
todos:
  - id: port-resolver
    content: Add optional `portResolver` to `NodeDefinition` interface in nodeRegistry.ts
    status: completed
  - id: store-sync
    content: "In workflowCanvasStore `updateConfigOfNodeById`: recompute portDefinition via portResolver and prune orphan edges"
    status: completed
  - id: engine-live-ports
    content: Change canConnect and executeWorkflow to read ports from node.data.portDefinition instead of registry
    status: completed
  - id: serialization-resolver
    content: "In workNodeSerialization deserialise: use portResolver(config) when available"
    status: completed
  - id: array-field-type
    content: Add generic `array` fieldType with `itemFields` to ConfigFieldDefinition and render it in WorkFlowConfigPanel with repeatable row add/remove UI
    status: pending
  - id: validation-array
    content: Add array field validation rule in workflowValidation.ts (each entry validated against itemFields)
    status: completed
  - id: switch-model
    content: Create SwitchWorkNode model class in src/models/nodes/
    status: pending
  - id: switch-executor
    content: Create SwitchNodeExecutor in src/engine/executors/switch/ — evaluates per-case operator+value against shared targetField
    status: pending
  - id: switch-renderer
    content: Create SwitchNodeRenderer.vue using DynamicHandleRenderer
    status: completed
  - id: switch-wiring
    content: Add factory case, registry entry, and canvas slot for SWITCH node
    status: completed
isProject: false
---

# Add SWITCH Node with Generic Dynamic-Port Infrastructure

## The Problem

`portDefinition` is currently **static** -- set once from the registry at node creation and never updated. SWITCH needs N output ports (one per user-defined case + a default), so ports must **react to config changes**. The config panel also lacks any array/repeatable field type.

The goal is to build **reusable infrastructure** so that any future dynamic-port control node (Priority Router, Parallel Fork, Weighted Split, etc.) is just a thin registry entry -- no new plumbing needed.

## Architecture Changes

### Layer 1: Config-Reactive Ports (`portResolver`)

Add an optional `portResolver` function to `[NodeDefinition](src/registry/nodeRegistry.ts)`:

```typescript
// In NodeDefinition interface
portResolver?: (config: Record<string, unknown>) => PortDefinition
```

- When present, `portResolver(config)` computes `PortDefinition` dynamically from the node's current config.
- When absent, existing static `portDefinition` is used (zero impact on START/TRANSFORM/DECISION/END).
- `portDefinition` on NodeDefinition remains as the **initial/default** value for freshly dropped nodes.

### Layer 2: Store Syncs Ports on Config Change

In `[workflowCanvasStore.ts](src/stores/workflowCanvasStore.ts)` `updateConfigOfNodeById`:

```typescript
// After: node.data.workNode.config[key] = value
const definition = getNodeDefinition(node.data.workNode.type);
if (definition.portResolver) {
  const newPortDef = definition.portResolver(node.data.workNode.config);
  node.data.portDefinition = newPortDef;
  // Prune edges whose sourceHandle no longer exists
  const validPortIds = new Set(newPortDef.outputPorts.map((p) => p.id));
  this.edges = this.edges.filter(
    (e) => e.source !== nodeId || validPortIds.has(e.sourceHandle ?? "out-0"),
  );
}
```

`DynamicHandleRenderer` already reads from `data.portDefinition`, so handles re-render automatically. Orphan edges are pruned when a case is removed.

### Layer 3: Engine and Validation Use Node's Live portDefinition

Two places currently read ports from the **registry** instead of the **node's live data**:

1. `[workflowEngine.ts` line 73](src/engine/workflowEngine.ts) `canConnect` -- change `sourceDefinition.portDefinition` to `sourceNode.data.portDefinition`
2. `[workflowEngine.ts` line 173](src/engine/workflowEngine.ts) `executeWorkflow` -- change `nodeDefinition.portDefinition.outputPorts` to `currentNode.data.portDefinition.outputPorts`

This makes `node.data.portDefinition` the **single source of truth** at runtime for all node types.

### Layer 4: Serialization Aware of portResolver

In `[workNodeSerialization.ts](src/serialization/workNodeSerialization.ts)` `deserialise`, when reconstructing a node:

```typescript
const portDefinition = definition.portResolver
  ? definition.portResolver(workNode.config)
  : definition.portDefinition;
```

Deserialized SWITCH nodes get the correct number of ports based on their saved config.

### Layer 5: Generic `array` Config Field Type

Instead of a narrow `case-list`, add a **generic `array` fieldType** with recursive `itemFields` to `[ConfigFieldDefinition](src/models/configSchema.ts)`:

```typescript
export interface ConfigFieldDefinition {
  key: string;
  label: string;
  fieldType: "text" | "number" | "select" | "json" | "checkbox" | "array";
  options?: string[];
  defaultValue?: unknown;
  placeholder?: string;
  visibleWhen?: { field: string; in: unknown[] };
  itemFields?: ConfigFieldDefinition[]; // sub-fields per array entry (only when fieldType === 'array')
}
```

In `[WorkFlowConfigPanel.vue](src/components/WorkFlowConfigPanel.vue)`, add a new template section for `array`:

- Renders each entry as a **card/row** containing the sub-fields defined by `itemFields`
- Each row has a **delete** button
- A **"+ Add"** button at the bottom appends a new entry (initialized from sub-field `defaultValue`s)
- Changes write the full array back to `config[field.key]` via `onFieldChange`

This is reusable for any future node that needs a dynamic list of sub-items.

### Layer 6: SWITCH Node Artifacts

**New files (3):**

- `src/models/nodes/switchWorkNode.ts` -- extends `BaseWorkNode`, returns `SwitchNodeExecutor`
- `src/engine/executors/switch/switchNodeExecutor.ts` -- per-case condition evaluation
- `src/components/nodeRenderers/SwitchNodeRenderer.vue` -- header + body + `DynamicHandleRenderer`

**Modified files (8):**

- `[configSchema.ts](src/models/configSchema.ts)` -- add `'array'` to fieldType union, add `itemFields`
- `[nodeRegistry.ts](src/registry/nodeRegistry.ts)` -- add `portResolver?` to interface, register SWITCH node
- `[workNodeFactory.ts](src/factory/workNodeFactory.ts)` -- add `case 'SWITCH'`
- `[WorkFlowCanvas.vue](src/components/WorkFlowCanvas.vue)` -- import renderer, add `#node-SWITCH` slot
- `[WorkFlowConfigPanel.vue](src/components/WorkFlowConfigPanel.vue)` -- render `array` fieldType with repeatable rows
- `[workflowCanvasStore.ts](src/stores/workflowCanvasStore.ts)` -- portResolver sync + edge pruning in `updateConfigOfNodeById`
- `[workflowEngine.ts](src/engine/workflowEngine.ts)` -- use `node.data.portDefinition` in `canConnect` and `executeWorkflow`
- `[workNodeSerialization.ts](src/serialization/workNodeSerialization.ts)` -- use `portResolver` in deserialise
- `[workflowValidation.ts](src/serialization/workflowValidation.ts)` -- add validation for `array` fieldType entries

### SWITCH Registry Entry

```typescript
registerNode({
  type: "SWITCH",
  label: "Switch",
  category: "control",
  icon: "🔀",
  portDefinition: {
    // initial/default for freshly dropped node
    inputCount: 1,
    outputPorts: [
      { id: "case-0", label: "Case A", color: "#3b82f6" },
      { id: "case-1", label: "Case B", color: "#8b5cf6" },
      { id: "default", label: "Default", color: "#6b7280" },
    ],
  },
  defaultConfig: {
    targetField: "",
    cases: [
      { label: "Case A", operator: "==", value: "" },
      { label: "Case B", operator: "==", value: "" },
    ],
  },
  configSchema: [
    {
      key: "targetField",
      label: "Target Field",
      fieldType: "text",
      placeholder: "e.g. status",
    },
    {
      key: "cases",
      label: "Cases",
      fieldType: "array",
      itemFields: [
        {
          key: "label",
          label: "Label",
          fieldType: "text",
          placeholder: "Case name",
        },
        {
          key: "operator",
          label: "Operator",
          fieldType: "select",
          options: ["==", "!=", ">", "<", "contains", "regex"],
        },
        {
          key: "value",
          label: "Value",
          fieldType: "text",
          placeholder: "Compare value",
        },
      ],
    },
  ],
  portResolver: (config) => {
    const cases =
      (config.cases as Array<{
        label: string;
        operator: string;
        value: string;
      }>) ?? [];
    const PALETTE = [
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#f59e0b",
      "#10b981",
      "#06b6d4",
    ];
    return {
      inputCount: 1,
      outputPorts: [
        ...cases.map((c, i) => ({
          id: `case-${i}`,
          label: c.label || `Case ${i}`,
          color: PALETTE[i % PALETTE.length],
        })),
        { id: "default", label: "Default", color: "#6b7280" },
      ],
    };
  },
  executorResolver: () => new SwitchNodeExecutor(),
});
```

### SwitchNodeExecutor Logic

Shared `targetField`, per-case `operator + value` -- same operators as DECISION:

```
read targetField, cases from config
get fieldValue = context.payload[targetField]
for each case[i]:
  if evaluateCondition(fieldValue, case.operator, case.value) is true:
    return outputPorts[i]       // case-0, case-1, ...
return outputPorts.find(p => p.id === 'default')   // fallback
```

`evaluateCondition` reuses the same logic as `DropdownDecisionExecutor` (==, !=, >, <, contains). Add `regex` as a new operator. Extract the shared evaluation function into a utility (`src/engine/executors/conditionEvaluator.ts`) so both DECISION and SWITCH can reuse it.

### Future Nodes This Infra Enables (no additional plumbing)

- **Priority Router** -- per-case `field + operator + value`, ordered evaluation, first match wins
- **Parallel Fork** -- `itemFields: [{label}]`, all ports fire simultaneously (engine change for fan-out)
- **Weighted Split** -- `itemFields: [{label, weight}]`, random selection by weight
- **Retry Escalation** -- `itemFields: [{delay, maxAttempts, label}]`, escalation levels
