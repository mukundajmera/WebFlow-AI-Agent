/**
 * CanvaAdapter — Website adapter for Canva (canva.com).
 *
 * Provides Canva-specific selectors, workflows, canvas interaction rules,
 * and prompt builders so the orchestration layer can drive the Canva editor.
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
  homeButton: '[data-testid="brand-logo"]',
  createButton: '[data-testid="create-blank-button"]',
  templatesTab: '[data-testid="templates-tab"]',
  searchInput: '[data-testid="search-input"]',
  canvasContainer: ".canvas-container",
  editor: '[data-testid="editor"]',
  designCanvas: '[data-testid="design-surface"]',
  textButton: '[data-testid="text-button"]',
  imagesButton: '[data-testid="images-button"]',
  elementsButton: '[data-testid="elements-button"]',
  uploadsButton: '[data-testid="upload-button"]',
  exportButton: '[data-testid="export-button"]',
  downloadButton: '[data-testid="download-button"]',
  fileTypeDropdown: '[data-testid="format-selector"]',
  templateCard: '[data-testid="template-item"]',
  templatePreview: '[data-testid="template-preview"]',
  useTemplateButton: '[data-testid="use-template-button"]',
  textElement: '[data-testid="text-layer"]',
  textInput: '[data-testid="text-input"]',
  modal: '[role="dialog"]',
  modalClose: '[data-testid="modal-close"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
};

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

const createFromTemplateWorkflow: Workflow = {
  name: "createFromTemplate",
  description: "Search for a template and start a new design from it",
  requirements: ["Must be on the Canva homepage or templates page"],
  steps: [
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.searchInput } },
      description: "Click the search input",
    },
    {
      action: { type: "type", target: { type: "css", selector: SELECTORS.searchInput }, value: "{{template_query}}" },
      description: "Enter the template search query",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: SELECTORS.templateCard } },
      description: "Wait for template results to appear",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.templateCard } },
      description: "Click the first matching template card",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: SELECTORS.useTemplateButton } },
      description: "Wait for the template preview to load",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.useTemplateButton } },
      description: "Click 'Use this template' to open in the editor",
    },
  ],
};

const editTextWorkflow: Workflow = {
  name: "editText",
  description: "Select and edit a text layer in the Canva editor canvas",
  requirements: ["Must be in the Canva editor with a design open"],
  steps: [
    {
      action: { type: "click", target: { type: "semantic", description: "{{text_layer_description}}" } },
      description: "Click the text layer to select it",
    },
    {
      action: { type: "wait", value: { type: "timeout", duration: 500 } },
      description: "Wait for layer selection",
    },
    {
      action: { type: "type", target: { type: "css", selector: SELECTORS.textInput }, value: "{{new_text}}" },
      description: "Replace the text content",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.designCanvas } },
      description: "Click the canvas to deselect and confirm",
    },
  ],
};

const replaceImageWorkflow: Workflow = {
  name: "replaceImage",
  description: "Replace an image layer in the current design",
  requirements: ["Must be in the Canva editor with a design open"],
  steps: [
    {
      action: { type: "click", target: { type: "semantic", description: "{{image_layer_description}}" } },
      description: "Click the image layer to select it",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: '[data-testid="replace-button"]' } },
      description: "Wait for the replace option to appear",
    },
    {
      action: { type: "click", target: { type: "css", selector: '[data-testid="replace-button"]' } },
      description: "Click the replace button",
    },
    {
      action: { type: "upload", target: { type: "css", selector: SELECTORS.uploadsButton }, value: "{{image_path}}" },
      description: "Upload the replacement image",
    },
  ],
};

const exportWorkflow: Workflow = {
  name: "export",
  description: "Export the current Canva design",
  requirements: ["Must be in the Canva editor with a design open"],
  steps: [
    {
      action: { type: "click", target: { type: "css", selector: '[data-testid="share-button"]' } },
      description: "Open the Share menu",
    },
    {
      action: { type: "wait", value: { type: "element_visible", selector: SELECTORS.downloadButton } },
      description: "Wait for the download option",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.downloadButton } },
      description: "Click the Download option",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.fileTypeDropdown } },
      description: "Open the file type dropdown",
      optional: true,
    },
    {
      action: { type: "click", target: { type: "semantic", description: "{{export_format}} format option" } },
      description: "Select the desired export format",
    },
    {
      action: { type: "click", target: { type: "css", selector: SELECTORS.exportButton } },
      description: "Click the Export / Download button",
    },
    {
      action: { type: "wait", value: { type: "timeout", duration: 5000 } },
      description: "Wait for the export to complete",
    },
  ],
};

const WORKFLOWS: WorkflowMap = {
  createFromTemplate: createFromTemplateWorkflow,
  editText: editTextWorkflow,
  replaceImage: replaceImageWorkflow,
  export: exportWorkflow,
};

// ---------------------------------------------------------------------------
// Canvas Rules
// ---------------------------------------------------------------------------

const CANVAS_RULES: CanvasRules = {
  editorSelector: '[data-testid="design-surface"]',
  requiresVision: true,
  clickableAreas: {
    textLayers: ".text-layer",
    images: ".image-layer",
    shapes: ".shape-layer",
  },
  interactions: {
    click: { strategy: "hybrid", fallback: "vision", waitAfter: 500 },
    drag: { strategy: "coordinate", fallback: "vision", waitAfter: 300 },
    text: { strategy: "hybrid", fallback: "vision", waitAfter: 200 },
  },
};

// ---------------------------------------------------------------------------
// Common Task Templates
// ---------------------------------------------------------------------------

const COMMON_TASKS: TaskTemplateMap = {
  createFromTemplate: {
    name: "Create from Template",
    workflow: createFromTemplateWorkflow,
    dataMapping: { template_query: "templateName" },
    conditions: [{ check: "!url.includes('canva.com')", action: "fail" }],
  },
  editText: {
    name: "Edit Text",
    workflow: editTextWorkflow,
    dataMapping: { new_text: "textContent", text_layer_description: "layerDescription" },
  },
  replaceImage: {
    name: "Replace Image",
    workflow: replaceImageWorkflow,
    dataMapping: { image_path: "imagePath", image_layer_description: "layerDescription" },
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
  "Canva renders designs on a single <canvas> element — individual layers must be located with vision.",
  "Double-click a text layer to enter editing mode before typing.",
  "Use Ctrl+A to select all text in a layer before replacing.",
  "Wait for the loading spinner to disappear before interacting with the editor.",
  "The Share → Download path is the primary export flow.",
];

// ---------------------------------------------------------------------------
// CanvaAdapter
// ---------------------------------------------------------------------------

/**
 * Adapter for driving the Canva web editor.
 *
 * Encapsulates all Canva-specific selectors, workflows, canvas interaction
 * rules, and prompt-building logic required by the orchestration layer.
 */
export class CanvaAdapter implements BaseAdapter {
  readonly name = "Canva";
  readonly supportedDomains = ["canva.com", "www.canva.com"];

  /** Return the full Canva knowledge base. */
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
   * Incorporates the current DOM state, task goal, previous actions, and
   * Canva-specific tips so the LLM can decide the next action.
   */
  buildThinkPrompt(observation: Observation): string {
    const { domState, task, previousActions, attempt, adapterKnowledge } = observation;

    const previousSummary = previousActions.length
      ? previousActions.map((a, i) => `  ${i + 1}. ${a.type} → ${JSON.stringify(a.target)}`).join("\n")
      : "  (none)";

    const tipBlock = adapterKnowledge.tips?.length
      ? `\nCanva Tips:\n${adapterKnowledge.tips.map((t) => `  - ${t}`).join("\n")}`
      : "";

    return [
      "You are an AI agent operating the Canva web editor.",
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
   * Build a verification prompt that checks whether the completed action
   * produced the expected outcome based on task type.
   */
  buildVerifyPrompt(task: Task, result: ActionResult): string {
    const criteria: Record<string, string> = {
      edit_text: "Verify the text layer now displays the expected content.",
      replace_image: "Verify the image layer shows the new image.",
      export: "Verify the export completed and a download was triggered.",
      navigation: "Verify the page navigated to the expected URL.",
      search: "Verify search results are visible.",
      select: "Verify the correct element is selected (selection handles visible).",
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
   * Execute a Canva-specific custom action.
   *
   * This is a stub — concrete browser automation is handled by the
   * ActionExecutor. The adapter logs the request and returns success.
   */
  async executeCustomAction(_action: BrowserAction): Promise<ActionResult> {
    console.debug("[CanvaAdapter] executeCustomAction (stub)");
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
    };
  }

  /** Called when a Canva page finishes loading. */
  async onPageLoad(): Promise<void> {
    console.info("[CanvaAdapter] Page loaded — Canva adapter ready");
  }

  /** Called when navigating away from Canva. */
  async onPageUnload(): Promise<void> {
    console.info("[CanvaAdapter] Page unloading — cleaning up");
  }
}
