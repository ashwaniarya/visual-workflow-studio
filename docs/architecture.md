Spec:

1. Node Palette: Create a left-side palette containing at least three node types:
   a. Start Node
   b. Transform Node
   c. If-else Condition Node
   d. End Node
   Users should be able to drag nodes from the palette onto the workflow canvas.

2. Canvas (Flow Builder UI): Implement a central canvas area where users can:
   a. Drag nodes from the palette
   b. Move nodes around
   c. Connect nodes using edges
   d. Pan and zoom across the canvas
   You can use a library like Vue Flow or any similar solution to assist with rendering nodes
   and connections.

3. Node Configuration Panel: When a node is selected, open a right-side panel or modal
   where users can configure that node. Examples:

a. Start Node: input payload (e.g., {"message": "hello"})
b. Transform Node: transformation logic (uppercase, append text, multiply number,etc.)
c. End Node: display final received payload

All configuration values must be fully reactive and stored in the application state.

4. Workflow State Management: Use Pinia/Vuex (preferred) or another state management library.The store should maintain nodes, edges, configuration, and their positions on the canvas.State should update when:

a. Nodes are added
b. Nodes are moved
c. Edges are created or removed
d. Configuration changes
e. Canvas is interacted with (zoom, pan, selection)

5. Run Workflow Simulation:Implement a "Run Workflow" feature that simulates the flow of data from the Start Node through all connected nodes in sequence.

Example flow:

Start Node output -> Transform Node (applies transformation) -> End Node
Display the execution logs in a panel:
Start Node -> { message: "hello" }
Transform Node -> { message: "HELLO" }
End Node -> { message: "HELLO" } 6. Save / Load Workflow: Implement export and import features:

a. Export the workflow as JSON (nodes, edges, configuration, positions).

b. Import the JSON to restore the workflow state.

## Tech Stack

a. Vite + TypeScript + Vue 3
b. State Management - Pinia

## Architecture

We will use Composition + Execution Strategy.

class BaseWorkNode {
id: string
type: string,
inputPort: InputPort
outputPorts: OutputPort[]

config: Record<string, unknown>

abstract getExecutor(): NodeExecutor;
}

class TransformWork extends BaseWorkNode {
// UI Specific: specific to vue flow for node

// Defualt
constructor(id, type){
// To populate
id and type
}

getExecutor() {
// Return specific strategy based on config
if(this.config.mode === 'UPPERCASE') return new UppercaseExecutor();
if(this.config.mode === "LOWERCASE') return new LowercaseExecutor();

    return new DefaultDecisionExecutor();

}
}

class DecisionWorkNode extends BaseWorkNode {
// UI Specific: specific to vue flow for node

getExecutor() {
// Returns specific strategy based on config
if (this.config.mode === 'IF_ELSE') return new IfElseExecutor();
if (this.config.mode === 'SWITCH') return new SwitchExecutor();
return new DefaultDecisionExecutor();
}
}

A Node Executor that will have specialised logic and return next node to the WorkFlow executor.

interface NodeExecutor {
// Returns the OutputPort to traverse next
execute(workFlowContext: any, config: any, outputs: OutputPort[]): OutputPort;
}

// The "Specialized" Logic
class IfElseExecutor implements NodeExecutor {
execute(workFlowContext: any, config: any, outputs: OutputPort[]) {
// Logic: If data satisfies condition, go to Output 0, else Output 1
const condition = data.value > config.threshold;
return condition ? outputs[0] : outputs[1];
}
}

## State Management

Lets keep one state called WorkFlowCanvas that will use pinia

it will have nodes, edge, excutionLog, availableWorkNodes, selectedWorkNode

RenderWorkNode it base of Node of Vue Flow . for example

type RenderWorkNode extends Node {
... value of vue flow node

workNode - The instance of work node droped from WorkViewToolBar

}

Actions

- updateNodeById
- updateConfigOfNodeId
- buildWorkFlow - takes nodes + edge and create DAG graph
- workflowExecutor - A while loop take run execute of the WorkNode and gets next node. The Strategy Executor will decide to send node or throw error.

## Components

- WorkFlowCanvas - Where nodes will be rendered
- WorkFlowToolBar - It will have list of WorkNode with defualt config.
- WorkFlowConfigPanel - On Select of a WorkNode it will prove option to change config.
