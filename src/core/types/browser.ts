/**
 * Browser automation types
 */

import type { BoundingBox, ElementSelector } from "./common";
import type { JSONSchema } from "./llm";

/**
 * Types of browser actions that can be executed
 */
export type ActionType =
  | "click"
  | "type"
  | "upload"
  | "wait"
  | "navigate"
  | "screenshot"
  | "scroll"
  | "hover"
  | "press_key"
  | "evaluate";

/**
 * Base interface for all browser actions
 */
export interface BrowserAction {
  type: ActionType;
  target?: ElementSelector;
  value?: unknown;
  options?: ActionOptions;
}

/**
 * Common options for browser actions
 */
export interface ActionOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
  /** Wait time after action (ms) */
  waitAfter?: number;
  /** Scroll element into view before action */
  scrollIntoView?: boolean;
}

/**
 * Click action configuration
 */
export interface ClickAction extends BrowserAction {
  type: "click";
  button?: "left" | "right" | "middle";
  clickCount?: number;
  modifiers?: ("Alt" | "Control" | "Meta" | "Shift")[];
}

/**
 * Type/input action configuration
 */
export interface TypeAction extends BrowserAction {
  type: "type";
  text: string;
  /** Delay between keystrokes (ms) */
  delay?: number;
  /** Clear existing content first */
  clearFirst?: boolean;
}

/**
 * Wait action configuration
 */
export interface WaitAction extends BrowserAction {
  type: "wait";
  condition: WaitCondition;
  /** Maximum wait time (ms) */
  timeout?: number;
}

/**
 * Conditions for wait actions
 */
export type WaitCondition =
  | { type: "element_visible"; selector: string }
  | { type: "element_hidden"; selector: string }
  | { type: "network_idle"; timeout?: number }
  | { type: "timeout"; duration: number }
  | { type: "text_visible"; text: string }
  | { type: "url_match"; pattern: string };

/**
 * Navigate action configuration
 */
export interface NavigateAction extends BrowserAction {
  type: "navigate";
  url: string;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}

/**
 * Scroll action configuration
 */
export interface ScrollAction extends BrowserAction {
  type: "scroll";
  direction?: "up" | "down" | "left" | "right";
  amount?: number;
  toElement?: boolean;
}

/**
 * Current state of the DOM
 */
export interface DOMState {
  url: string;
  title: string;
  visibleElements: VisibleElement[];
  forms: FormElement[];
  canvasElements: CanvasElement[];
  iframes: IFrameInfo[];
  timestamp: string;
}

/**
 * A visible element on the page
 */
export interface VisibleElement {
  tagName: string;
  selector: string;
  text: string;
  bbox: BoundingBox;
  attributes: Record<string, string>;
  isInteractive: boolean;
}

/**
 * A form element on the page
 */
export interface FormElement {
  selector: string;
  inputs: Array<{
    name: string;
    type: string;
    value: string;
    required: boolean;
  }>;
  submitButton?: string;
}

/**
 * A canvas element on the page
 */
export interface CanvasElement {
  selector: string;
  width: number;
  height: number;
  context: "2d" | "webgl" | "webgl2" | "unknown";
}

/**
 * Information about iframes on the page
 */
export interface IFrameInfo {
  selector: string;
  src: string;
  sandboxed: boolean;
}

/**
 * MCP action to execute via MCP server
 */
export interface MCPAction {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * MCP tool definition
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * Result from an MCP tool call
 */
export interface MCPToolResult {
  content: string;
  isError: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  /** Command to run (e.g., "npx") */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env?: Record<string, string>;
}
