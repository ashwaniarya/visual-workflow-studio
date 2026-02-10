# Graph Render Performance Audit

## Scope

This audit compares graph editing behavior before and after the selective-render refactor for workflows around 100 nodes.

## Baseline versus Refactor

| Operation          | Baseline behavior (before)                                                 | Refactor behavior (after)                                                 | Expected render impact                                                   |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Node drag          | Position commit through direct store update                                | Position commits through `applyNodeChanges` targeted update               | Touches dragged node path, avoids broad list replacement                 |
| Node config update | Node config mutate, plus full `edges = edges.filter(...)` on dynamic ports | Node config mutate, then targeted invalid-edge removal by adjacency index | Removes only invalid edges, no full edge-array replacement               |
| Node delete        | Full `nodes.filter` and `edges.filter` replacements                        | Incident edge lookup by adjacency index + `splice` removals               | Mutates only impacted entities while preserving top-level array identity |
| Edge delete        | Full `edges.filter` replacement                                            | Indexed edge remove + `splice`                                            | Updates only edge list entry, keeps array identity                       |
| Add edge           | Push to array                                                              | Indexed add + adjacency index update + push                               | Incremental edge add with O(1) index bookkeeping                         |
| Import graph       | Replace `nodes` and `edges` references                                     | `replaceGraphData` rebuilds indexes and updates arrays via `splice`       | Preserves consumer array references                                      |

## Architectural Changes Implemented

1. `workflowCanvasStore` now has normalized graph indexes:
   - `nodeById: Map<string, RenderWorkNode>`
   - `edgeById: Map<string, Edge>`
   - `adjacencyByNodeId: Map<string, Set<string>>`
2. Canvas edit pipeline now uses Vue Flow granular change streams:
   - `onNodesChange -> applyNodeChanges`
   - `onEdgesChange -> applyEdgeChanges`
3. Node renderer slots now pass a narrowed prop surface (`id`, `data`) instead of full slot payload spread.
4. Edge renderer props are narrowed to only fields needed by the renderer.

## Validation Evidence

Automated test suite status after refactor:

- Test command: `npm test`
- Result: `15 passed, 106 passed tests total`
- Includes new targeted graph-store coverage:
  - Stable array identity for node/edge add-remove flows
  - Dynamic switch port edge pruning correctness
  - Targeted node/edge change set application

## Practical Performance Effect for 100-Node DAGs

- Reduced reactive fan-out during structural edits because graph arrays are no longer recreated for common operations.
- Lower update scope during dynamic port changes by removing only incident invalid edges.
- Improved compatibility with Vue Flow's intended change-driven update model, reducing unnecessary downstream rerender work in node and edge renderers.
