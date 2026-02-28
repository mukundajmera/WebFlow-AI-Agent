/**
 * GenericWebAdapter — Fallback adapter for any website.
 *
 * Uses generic semantic selectors and DOM-analysis-focused prompts so the
 * agent can operate on sites that have no dedicated adapter.
 */

import type {
  BaseAdapter,
  AdapterKnowledge,
  SelectorMap,
  WorkflowMap,
  TaskTemplateMap,
  Workflow,
  Observation,
  Task,
} from "~types/adapter";
import type { ActionResult } from "~types/common";
import type { BrowserAction } from "~types/browser";

// ---------------------------------------------------------------------------
// Selectors (generic semantic / ARIA-based)
// ---------------------------------------------------------------------------

const SELECTORS: SelectorMap = {
  button: "button, [role='button'], input[type='button'], input[type='submit']",
  input: "input, textarea, [contenteditable='true']",
  link: "a[href], [role='link']",
  image: "img, [role='img'], svg",
  canvas: "canvas",
};

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

const fillFormWorkflow: Workflow = {
  name: "fillForm",
  description: "Fill out a form on the page",
  steps: [
    {
      action: { type: "click", target: { type: "css", selector: "input, textarea" } },
      description: "Click the target form field",
    },
    {
      action: { type: "type", target: { type: "css", selector: "input, textarea" }, value: "{{field_value}}" },
      description: "Type the value into the field",
    },
  ],
};

const clickButtonWorkflow: Workflow = {
  name: "clickButton",
  description: "Click a button identified by label or selector",
  steps: [
    {
      action: { type: "click", target: { type: "semantic", description: "{{button_description}}" } },
      description: "Click the target button",
    },
    {
      action: { type: "wait", options: { timeout: 1000 } },
      description: "Wait for the action to take effect",
    },
  ],
};

const WORKFLOWS: WorkflowMap = {
  fillForm: fillFormWorkflow,
  clickButton: clickButtonWorkflow,
};

// ---------------------------------------------------------------------------
// Common Task Templates
// ---------------------------------------------------------------------------

const COMMON_TASKS: TaskTemplateMap = {
  fillForm: {
    name: "Fill Form",
    workflow: fillFormWorkflow,
    dataMapping: { field_value: "value" },
  },
  clickButton: {
    name: "Click Button",
    workflow: clickButtonWorkflow,
    dataMapping: { button_description: "buttonLabel" },
  },
};

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

const TIPS: string[] = [
  "No dedicated adapter is available — rely on DOM analysis and visual detection.",
  "Prefer ARIA roles and semantic HTML selectors for resilience.",
  "Use vision to confirm changes when the DOM structure is unclear.",
];

// ---------------------------------------------------------------------------
// GenericWebAdapter
// ---------------------------------------------------------------------------

/**
 * Fallback adapter that works with any website.
 *
 * Prioritises DOM analysis and visual detection over site-specific selectors,
 * making it suitable as a last-resort adapter when no specialised one matches.
 */
export class GenericWebAdapter implements BaseAdapter {
  readonly name = "Generic Web";
  readonly supportedDomains = ["*"];

  /** Return the generic knowledge base. */
  getKnowledge(): AdapterKnowledge {
    return {
      selectors: SELECTORS,
      workflows: WORKFLOWS,
      commonTasks: COMMON_TASKS,
      tips: TIPS,
    };
  }

  /**
   * Build a Think-phase prompt that emphasises DOM analysis and visual
   * detection because no site-specific knowledge is available.
   */
  buildThinkPrompt(observation: Observation): string {
    const { domState, task, previousActions, attempt } = observation;

    const previousSummary = previousActions.length
      ? previousActions.map((a, i) => `  ${i + 1}. ${a.type} → ${JSON.stringify(a.target)}`).join("\n")
      : "  (none)";

    return [
      "You are an AI agent operating a generic website. No site-specific adapter is available.",
      "Rely on DOM analysis and visual detection to decide actions.",
      "",
      `Current URL: ${domState.url}`,
      `Page title: ${domState.title}`,
      `Task: ${task.goal} (type: ${task.type}, attempt ${attempt})`,
      `Visible interactive elements: ${domState.visibleElements.filter((e) => e.isInteractive).length}`,
      `Forms on page: ${domState.forms.length}`,
      `Previous actions:\n${previousSummary}`,
      "",
      "Decide the single next BrowserAction to take. Return JSON with one of these shapes:",
      '- For most actions: { "type": "<ActionType>", "target": { ... }, "value": <any> }',
      '- For wait actions: { "type": "wait", "target": { "type": "css", "selector": "<selector>" }, "options": { "timeout": <ms> } }',
    ].join("\n");
  }

  /**
   * Build a generic verification prompt.
   */
  buildVerifyPrompt(task: Task, result: ActionResult): string {
    return [
      `Task: ${task.goal}`,
      `Result: ${result.success ? "success" : "failure"} (${result.duration}ms)`,
      result.error ? `Error: ${result.error}` : "",
      "",
      "Verify the action completed successfully by examining the page.",
      "Return JSON:",
      '{ "success": <boolean>, "reasoning": "<string>", "confidence": <0-100> }',
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Execute a custom action (stub — no site-specific logic).
   */
  async executeCustomAction(_action: BrowserAction): Promise<ActionResult> {
    console.debug("[GenericWebAdapter] executeCustomAction (stub)");
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
    };
  }
}
