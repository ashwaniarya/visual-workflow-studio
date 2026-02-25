export const UI_STRINGS = {
  app: {
    headerTitle: "⚡ Visual Workflow Studio",
    autosaveIndicatorLabel: "Saving",
    canvasLoadingMessage: "Loading workflow canvas…",
  },
  appHeader: {
    themeSelectionAccessibleLabel: "Select application theme mode",
    themeModeOptions: {
      system: "System",
      dark: "Dark",
      light: "Light",
    },
    actionButtons: {
      exportWorkflow: {
        label: "📤 Export",
        accessibleLabel: "Export workflow as JSON file",
      },
      importWorkflow: {
        label: "📥 Import",
        accessibleLabel: "Import workflow from JSON file",
      },
      clearWorkflow: {
        label: "🧹 Clear Workflow",
        accessibleLabel: "Clear workflow after confirmation",
      },
      undoWorkflowAction: {
        label: "↶ Undo",
        accessibleLabel: "Undo last workflow action",
      },
      redoWorkflowAction: {
        label: "↷ Redo",
        accessibleLabel: "Redo last workflow action",
      },
    },
  },
  modal: {
    clearWorkflow: {
      title: "Clear workflow?",
      message: "Are you sure you want to clear?",
      actions: {
        cancel: {
          buttonLabel: "No",
          buttonVariant: "secondary",
        },
        confirm: {
          buttonLabel: "Yes",
          buttonVariant: "danger",
        },
      },
    },
  },
  workflowToolBar: {
    toolbarTitle: "📦 Nodes",
    toolbarContainerAriaLabel: "Workflow node library",
    draggableNodesAriaLabel: "Draggable workflow nodes",
  },
  workflowExecutionLog: {
    title: "📋 Execution Log",
    ariaLabel: "Workflow execution results",
    runButton: {
      defaultLabel: "▶ Run",
      runningLabel: "⏳ Running...",
      accessibleLabel: {
        default: "Run workflow execution",
        running: "Workflow execution in progress",
      },
    },
    clearButton: {
      label: "🗑 Clear",
      accessibleLabel: "Clear workflow execution log",
    },
    emptyState: {
      prefix: "No execution log yet. Build a workflow and click",
      actionLabel: "Run",
    },
    logLabels: {
      step: "Step",
      input: "In:",
      output: "Out:",
      port: "→ Port:",
      next: "→ Next:",
    },
  },
  workflowConfigPanel: {
    configSuffix: "Config",
    nodeIdLabel: "Node ID",
    closePanelAccessibleLabel: "Close node configuration panel",
    emptyStateMessage: "👈 Select a node to configure",
  },
  workflowJsonConfigField: {
    invalidJsonMessage: "Invalid JSON. Check syntax and try again.",
  },
  workflowArrayConfigField: {
    addButtonPrefix: "+ Add",
    removeEntryAccessibleLabelPrefix: "Remove",
    removeEntrySuffix: "entry",
    defaultEntryLabel: "Entry",
  },
  nodeRenderers: {
    startNodeHeader: "▶ Start",
    transformNodeHeader: "🔄 Transform",
    ifElseNodeHeader: "🔀 If / Else",
    decisionNodeHeader: "🔀 Decision",
    switchNodeHeader: "🔀 Switch",
    switchCaseLabel: "cases",
    endNodeHeader: "⏹ End",
    urlShortenerNodeHeader: "🔗 URL Shortener",
    deleteNodeButtonTitle: "Delete node",
    deleteNodeButtonAriaLabel: "Delete node",
  },
  edgeRenderers: {
    deleteEdgeButtonTitle: "Delete edge",
    deleteEdgeButtonAriaLabel: "Delete edge",
  },
} as const;

export type UiStrings = typeof UI_STRINGS;
