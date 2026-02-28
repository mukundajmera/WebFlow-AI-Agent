/**
 * FigmaAdapter — Website adapter for Figma (figma.com).
 *
 * Provides Figma-specific selectors, workflows, and prompt builders so the
 * orchestration layer can drive the Figma editor.
 */

import type {
  BaseAdapter,
  AdapterKnowledge,
  SelectorMap,
  WorkflowMap,
  CanvasRules,
  TaskTemplateMap,
  Workflow,
  Observation,
  Task,
} from "~types/adapter";
import type { ActionResult } from "~types/common";
import type { BrowserAction } from "~types/browser";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const SELECTORS: SelectorMap = {
  homeButton: '[data-testid="home-link"]',
  newFileButton: '[data-testid="new-file-button"]',
  canvas: '[data-testid="canvas"]',
  viewport: '[data-testid="viewport"]',
  toolbar: '[data-testid="toolbar"]',
  textTool: '[data-testid="text-tool"]',
  rectangleTool: '[data-testid="rectangle-tool"]',
  layersPanel: '[data-testid="layers-panel"]',
  textLayer: '[data-testid="text-layer"]',
  exportButton: '[data-testid="export-button"]',
  exportDialog: '[data-testid="export-dialog"]',
};

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

const openFileWorkflow: Workflow = {
  name: "openFile",
  description: "Open an existing Figma file from the dashboard",
  requirements: ["Must be on the Figma dashboard"],
  steps: [
    {
      action: { type: "click", target: { type: "semantic", description: "{{file_name}} file card" } },
      description: "Click the file card to open it",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: SELECTORS.canvas } },
      description: "Wait for the Figma canvas to load",
    },
  ],
};

const editTextWorkflow: Workflow = {
  name: "editText",
  description: "Select and edit a text node in the Figma canvas",
  requirements: ["Must be in the Figma editor with a file open"],
  steps: [
    {
      action: { type: "click", target: { type: "semantic", description: "{{text_layer_description}}" } },
      description: "Click the text node on the canvas",
    },
    {
      action: { type: "wait", value: { type: "timeout", duration: 300 } },
      description: "Wait for the node to be selected",
    },
    {
      action: { type: "press_key", value: "Enter" },
      description: "Press Enter to enter text editing mode",
    },
    {
      action: { type: "press_key", value: "Control+a" },
      description: "Select all text in the node",
    },
    {
      action: { type: "type", target: { type: "css", selector: SELECTORS.canvas }, value: "{{new_text}}" },
      description: "Type the replacement text",
    },
    {
      action: { type: "press_key", value: "Escape" },
      description: "Press Escape to exit text editing mode",
    },
  ],
};

const exportWorkflow: Workflow = {
  name: "export",
  description: "Export the current selection or frame from Figma",
  requirements: ["Must be in the Figma editor with a frame or element selected"],
  steps: [
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.exportButton } },
      description: "Click the Export button in the right panel",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: SELECTORS.exportDialog } },
      description: "Wait for the export dialog to appear",
    },
    {
      action: { type: "click", target: { type: "semantic", description: "{{export_format}} format option" } },
      description: "Select the desired export format",
      optional: true,
    },
    {
      action: { type: "click", target: { type: "semantic", description: "Export button" } },
      description: "Click the Export button to download",
    },
    {
      action: { type: "wait", value: { type: "timeout", duration: 3000 } },
      description: "Wait for the download to start",
    },
  ],
};

const WORKFLOWS: WorkflowMap = {
  openFile: openFileWorkflow,
  editText: editTextWorkflow,
  export: exportWorkflow,
};

// ---------------------------------------------------------------------------
// Canvas Rules
// ---------------------------------------------------------------------------

const CANVAS_RULES: CanvasRules = {
  editorSelector: '[data-testid="canvas"]',
  requiresVision: true,
  clickableAreas: {
    textLayers: ".text-node",
    images: ".image-node",
    shapes: ".shape-node",
  },
  interactions: {
    click: { strategy: "hybrid", fallback: "vision", waitAfter: 400 },
    drag: { strategy: "coordinate", fallback: "vision", waitAfter: 300 },
    text: { strategy: "hybrid", fallback: "vision", waitAfter: 200 },
  },
};

// ---------------------------------------------------------------------------
// Common Task Templates
// ---------------------------------------------------------------------------

const COMMON_TASKS: TaskTemplateMap = {
  openFile: {
    name: "Open File",
    workflow: openFileWorkflow,
    dataMapping: { file_name: "fileName" },
    conditions: [{ check: "!url.includes('figma.com')", action: "fail" }],
  },
  editText: {
    name: "Edit Text",
    workflow: editTextWorkflow,
    dataMapping: { new_text: "textContent", text_layer_description: "layerDescription" },
  },
  export: {
    name: "Export Design",
    workflow: exportWorkflow,
    dataMapping: { export_format: "format" },
  },
};

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

const TIPS: string[] = [
  "Figma uses a WebGL canvas — individual layers must be located with vision or the layers panel.",
  "Press Enter on a selected text node to enter editing mode.",
  "Use Ctrl+A to select all text before replacing.",
  "The right-hand Design panel contains export settings when a frame is selected.",
];

// ---------------------------------------------------------------------------
// FigmaAdapter
// ---------------------------------------------------------------------------

/**
 * Adapter for driving the Figma web editor.
 *
 * Encapsulates Figma-specific selectors, workflows, canvas interaction rules,
 * and prompt-building logic for the orchestration layer.
 */
export class FigmaAdapter implements BaseAdapter {
  readonly name = "Figma";
  readonly supportedDomains = ["figma.com", "www.figma.com"];

  /** Return the full Figma knowledge base. */
  getKnowledge(): AdapterKnowledge {
    return {
      selectors: SELECTORS,
      workflows: WORKFLOWS,
      canvasRules: CANVAS_RULES,
      commonTasks: COMMON_TASKS,
      tips: TIPS,
    };
  }

  /**
   * Build a context-aware prompt for the Think phase.
   *
   * Provides the LLM with current page state, task goal, and Figma-specific
   * guidance to decide the next action.
   */
  buildThinkPrompt(observation: Observation): string {
    const { domState, task, previousActions, attempt, adapterKnowledge } = observation;

    const previousSummary = previousActions.length
      ? previousActions.map((a, i) => `  ${i + 1}. ${a.type} → ${JSON.stringify(a.target)}`).join("\n")
      : "  (none)";

    const tipBlock = adapterKnowledge.tips?.length
      ? `\nFigma Tips:\n${adapterKnowledge.tips.map((t) => `  - ${t}`).join("\n")}`
      : "";

    return [
      "You are an AI agent operating the Figma web editor.",
      `Current URL: ${domState.url}`,
      `Page title: ${domState.title}`,
      `Task: ${task.goal} (type: ${task.type}, attempt ${attempt})`,
      `Visible elements: ${domState.visibleElements.length}`,
      `Previous actions:\n${previousSummary}`,
      tipBlock,
      "",
      "Decide the single next BrowserAction to take. Return JSON:",
      '{ "type": "<ActionType>", "target": { ... }, "value": <any> }',
    ].join("\n");
  }

  /**
   * Build a verification prompt tailored to the completed task type.
   */
  buildVerifyPrompt(task: Task, result: ActionResult): string {
    const criteria: Record<string, string> = {
      edit_text: "Verify the text node now displays the expected content.",
      replace_image: "Verify the image fill shows the new asset.",
      export: "Verify the export completed and a download was triggered.",
      navigation: "Verify the file is open in the Figma editor.",
      select: "Verify the correct node is selected (blue selection border visible).",
    };

    const check = criteria[task.type] ?? "Verify the action completed successfully.";

    return [
      `Task: ${task.goal}`,
      `Result: ${result.success ? "success" : "failure"} (${result.duration}ms)`,
      result.error ? `Error: ${result.error}` : "",
      "",
      `Verification criteria: ${check}`,
      "Examine the screenshot and return JSON:",
      '{ "success": <boolean>, "reasoning": "<string>", "confidence": <0-100> }',
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Execute a Figma-specific custom action (stub).
   */
  async executeCustomAction(_action: BrowserAction): Promise<ActionResult> {
    console.debug("[FigmaAdapter] executeCustomAction (stub)");
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
    };
  }

  /** Called when a Figma page finishes loading. */
  async onPageLoad(): Promise<void> {
    console.info("[FigmaAdapter] Page loaded — Figma adapter ready");
  }

  /** Called when navigating away from Figma. */
  async onPageUnload(): Promise<void> {
    console.info("[FigmaAdapter] Page unloading — cleaning up");
  }
}
