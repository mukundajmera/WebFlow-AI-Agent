/**
 * Adapter system types for website-specific logic
 */

import type { ActionResult } from "./common";
import type { BrowserAction, DOMState } from "./browser";
import type { Screenshot } from "./vision";
import type { Task, TaskType, TaskStatus, Observation, DataMapping } from "./orchestration";

// Re-export imported types for convenience
export type { Task, TaskType, TaskStatus, Observation, DataMapping };

/**
 * Base interface that all website adapters must implement
 */
export interface BaseAdapter {
  /** Unique name for this adapter */
  name: string;
  /** Domains this adapter supports (e.g., ["canva.com", "www.canva.com"]) */
  supportedDomains: string[];

  /** Get the knowledge base for this adapter */
  getKnowledge(): AdapterKnowledge;

  /** Build a prompt for the Think phase given current observation */
  buildThinkPrompt(observation: Observation): string;

  /** Build a prompt to verify task completion */
  buildVerifyPrompt(task: Task, result: ActionResult): string;

  /** Execute a custom action specific to this adapter */
  executeCustomAction(action: BrowserAction): Promise<ActionResult>;

  /** Called when page loads (optional hook) */
  onPageLoad?(): Promise<void>;

  /** Called when navigating away (optional hook) */
  onPageUnload?(): Promise<void>;
}

/**
 * Knowledge base for an adapter
 */
export interface AdapterKnowledge {
  /** Map of element names to CSS selectors */
  selectors: SelectorMap;
  /** Map of workflow names to workflow definitions */
  workflows: WorkflowMap;
  /** Rules for canvas element interaction (if applicable) */
  canvasRules?: CanvasRules;
  /** Common task templates */
  commonTasks: TaskTemplateMap;
  /** Tips for working with this site */
  tips?: string[];
}

/**
 * Map of element names to their selectors
 */
export type SelectorMap = Record<string, string>;

/**
 * Extended selector with metadata
 */
export interface SelectorMetadata {
  selector: string;
  description: string;
  /** Fallback selectors if primary fails */
  alternatives?: string[];
  /** Whether vision is required to locate this element */
  requiresVision?: boolean;
}

/**
 * A multi-step workflow definition
 */
export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  /** Prerequisites that must be met */
  requirements?: string[];
}

/**
 * A single step in a workflow
 */
export interface WorkflowStep {
  action: BrowserAction;
  description: string;
  /** Whether this step can be skipped */
  optional?: boolean;
  /** Alternative steps if this one fails */
  fallback?: WorkflowStep[];
}

/**
 * Map of workflow names to definitions
 */
export type WorkflowMap = Record<string, Workflow>;

/**
 * Rules for interacting with canvas elements
 */
export interface CanvasRules {
  /** Selector for the main editor canvas */
  editorSelector: string;
  /** Whether vision is required for canvas interactions */
  requiresVision: boolean;
  /** Selectors for different clickable areas within the canvas */
  clickableAreas: {
    textLayers: string;
    images: string;
    shapes: string;
  };
  /** Interaction rules for different action types */
  interactions: {
    click: CanvasInteractionRule;
    drag: CanvasInteractionRule;
    text: CanvasInteractionRule;
  };
}

/**
 * Rule for how to interact with canvas elements.
 * Note: 'hybrid' is not a valid fallback because it requires both vision and coordinate
 * strategies to work together, which doesn't make sense as a fallback mechanism.
 */
export interface CanvasInteractionRule {
  strategy: "vision" | "coordinate" | "hybrid";
  /** Fallback strategy if primary fails. 'hybrid' is excluded as it's not a valid fallback. */
  fallback?: "vision" | "coordinate";
  /** Wait time after interaction (ms) */
  waitAfter?: number;
}

/**
 * A reusable task template
 */
export interface TaskTemplate {
  name: string;
  workflow: Workflow;
  /** Mapping of design fields to data columns */
  dataMapping?: DataMapping;
  /** Conditions for running this task */
  conditions?: TaskCondition[];
}

/**
 * Map of task names to templates
 */
export type TaskTemplateMap = Record<string, TaskTemplate>;

/**
 * Condition for task execution
 */
export interface TaskCondition {
  /** Condition expression to evaluate */
  check: string;
  /** Action to take if condition fails */
  action: "skip" | "fail" | "warn";
}
