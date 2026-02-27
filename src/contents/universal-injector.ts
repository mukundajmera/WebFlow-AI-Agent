/**
 * Universal Content Script Injector
 * Injected into all pages to enable browser automation
 */

import type { ActionResult, BrowserAction, BoundingBox, WaitAction } from "~types";

/**
 * Message types for content script communication
 */
type ContentMessage =
  | { type: "EXECUTE_ACTION"; payload: BrowserAction }
  | { type: "GET_DOM_STATE" }
  | { type: "TAKE_SCREENSHOT"; payload?: { selector?: string } };

/**
 * Handle messages from the background script
 */
chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse: (response: ActionResult) => void) => {
    handleMessage(message)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          success: false,
          error: String(error),
          timestamp: new Date().toISOString(),
          duration: 0,
        })
      );

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

/**
 * Process incoming messages
 */
async function handleMessage(message: ContentMessage): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    switch (message.type) {
      case "EXECUTE_ACTION":
        return await executeAction(message.payload, startTime);

      case "GET_DOM_STATE":
        return await getDOMState(startTime);

      case "TAKE_SCREENSHOT":
        // Screenshots are captured via chrome.tabs.captureVisibleTab in background script
        // Content script can only prepare the page or return element info
        return {
          success: true,
          data: {
            message: "Screenshot capture is handled by background script",
            selector: message.payload?.selector,
          },
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        };

      default:
        return {
          success: false,
          error: `Unknown message type`,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute a browser action on the page
 */
async function executeAction(action: BrowserAction, startTime: number): Promise<ActionResult> {
  switch (action.type) {
    case "click":
      return await executeClick(action, startTime);

    case "type":
      return await executeType(action, startTime);

    case "wait":
      return await executeWait(action, startTime);

    default:
      return {
        success: false,
        error: `Unsupported action type: ${action.type}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
  }
}

/**
 * Execute a click action
 */
async function executeClick(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    const element = findElement(action.target);
    if (!element) {
      return {
        success: false,
        error: "Element not found",
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    // Scroll into view if needed
    if (action.options?.scrollIntoView !== false) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(100);
    }

    // Click the element
    (element as HTMLElement).click();

    // Wait after action if specified
    if (action.options?.waitAfter) {
      await sleep(action.options.waitAfter);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute a type action
 */
async function executeType(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    const element = findElement(action.target);
    if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return {
        success: false,
        error: "Input element not found",
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    // Handle both `value` (from workflows) and `text` (from TypeAction interface)
    type TypeActionPayload = { clearFirst?: boolean; value?: unknown; text?: string };
    const typeAction = action as TypeActionPayload;
    
    if (typeAction.clearFirst) {
      element.value = "";
    }

    // Determine the text to type (prefer `value`, fall back to `text` for compatibility)
    let textToType = "";
    if (typeof typeAction.value === "string") {
      textToType = typeAction.value;
    } else if (typeof typeAction.text === "string") {
      textToType = typeAction.text;
    }

    // Type the text
    element.focus();
    element.value = textToType;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait after action if specified
    if (action.options?.waitAfter) {
      await sleep(action.options.waitAfter);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute a wait action
 */
async function executeWait(action: BrowserAction, startTime: number): Promise<ActionResult> {
  // Cast to WaitAction which has timeout at action level
  const waitAction = action as WaitAction;
  const condition = waitAction.condition;

  if (!condition) {
    return {
      success: false,
      error: "Wait condition not specified",
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }

  // WaitAction defines timeout at action level, fallback to options.timeout
  const timeout = waitAction.timeout || action.options?.timeout || 30000;

  try {
    switch (condition.type) {
      case "timeout":
        await sleep(condition.duration || 1000);
        break;

      case "element_visible":
        await waitForElement(condition.selector || "", timeout);
        break;

      default:
        return {
          success: false,
          error: `Unknown wait condition: ${condition.type}`,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        };
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get current DOM state
 */
async function getDOMState(startTime: number): Promise<ActionResult> {
  const state = {
    url: window.location.href,
    title: document.title,
    visibleElements: getVisibleElements(),
    forms: getForms(),
    canvasElements: getCanvasElements(),
    iframes: getIframes(),
    timestamp: new Date().toISOString(),
  };

  return {
    success: true,
    data: state,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Find an element based on selector
 */
function findElement(target?: { type: string; selector?: string; x?: number; y?: number }): Element | null {
  if (!target) return null;

  switch (target.type) {
    case "css":
      return target.selector ? document.querySelector(target.selector) : null;

    case "coordinates":
      return document.elementFromPoint(target.x || 0, target.y || 0);

    default:
      return null;
  }
}

/**
 * Get visible interactive elements with all required fields
 */
function getVisibleElements(): Array<{
  tagName: string;
  selector: string;
  text: string;
  bbox: BoundingBox;
  attributes: Record<string, string>;
  isInteractive: boolean;
}> {
  const elements: Array<{
    tagName: string;
    selector: string;
    text: string;
    bbox: BoundingBox;
    attributes: Record<string, string>;
    isInteractive: boolean;
  }> = [];

  const interactiveSelectors = "a, button, input, select, textarea, [role='button'], [onclick]";
  const interactiveElements = document.querySelectorAll(interactiveSelectors);

  interactiveElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // Collect attributes
      const attributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }

      elements.push({
        tagName: el.tagName.toLowerCase(),
        selector: generateSelector(el, index),
        text: (el.textContent || "").trim().substring(0, 100),
        bbox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        attributes,
        isInteractive: true,
      });
    }
  });

  return elements.slice(0, 100); // Limit to 100 elements
}

/**
 * Get form elements with all required fields
 */
function getForms(): Array<{
  selector: string;
  inputs: Array<{ name: string; type: string; value: string; required: boolean }>;
  submitButton?: string;
}> {
  const forms: Array<{
    selector: string;
    inputs: Array<{ name: string; type: string; value: string; required: boolean }>;
    submitButton?: string;
  }> = [];

  document.querySelectorAll("form").forEach((form, index) => {
    const inputs: Array<{ name: string; type: string; value: string; required: boolean }> = [];
    form.querySelectorAll("input, select, textarea").forEach((input) => {
      const inputEl = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      inputs.push({
        name: input.getAttribute("name") || input.getAttribute("id") || "",
        type: input.getAttribute("type") || input.tagName.toLowerCase(),
        value: inputEl.value || "",
        required: input.hasAttribute("required"),
      });
    });

    // Find submit button
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const submitSelector = submitBtn ? generateSelector(submitBtn, 0) : undefined;

    forms.push({
      selector: `form:nth-of-type(${index + 1})`,
      inputs,
      submitButton: submitSelector,
    });
  });

  return forms;
}

/**
 * Get canvas elements with all required fields
 */
function getCanvasElements(): Array<{
  selector: string;
  width: number;
  height: number;
  renderingContext: "2d" | "webgl" | "webgl2" | "unknown";
}> {
  const canvases: Array<{
    selector: string;
    width: number;
    height: number;
    renderingContext: "2d" | "webgl" | "webgl2" | "unknown";
  }> = [];

  document.querySelectorAll("canvas").forEach((canvas, index) => {
    // Try to detect the rendering context
    let renderingContext: "2d" | "webgl" | "webgl2" | "unknown" = "unknown";
    try {
      if (canvas.getContext("2d")) {
        renderingContext = "2d";
      } else if (canvas.getContext("webgl2")) {
        renderingContext = "webgl2";
      } else if (canvas.getContext("webgl")) {
        renderingContext = "webgl";
      }
    } catch {
      // Context already acquired with different type
      renderingContext = "unknown";
    }

    canvases.push({
      selector: `canvas:nth-of-type(${index + 1})`,
      width: canvas.width,
      height: canvas.height,
      renderingContext,
    });
  });

  return canvases;
}

/**
 * Get iframe information with all required fields
 */
function getIframes(): Array<{ selector: string; src: string; sandboxed: boolean }> {
  const iframes: Array<{ selector: string; src: string; sandboxed: boolean }> = [];

  document.querySelectorAll("iframe").forEach((iframe, index) => {
    iframes.push({
      selector: `iframe:nth-of-type(${index + 1})`,
      src: iframe.src || "",
      sandboxed: iframe.hasAttribute("sandbox"),
    });
  });

  return iframes;
}

/**
 * Generate a CSS selector for an element
 */
function generateSelector(el: Element, index: number): string {
  if (el.id) return `#${el.id}`;

  const classes = Array.from(el.classList)
    .filter((c) => !c.includes("__"))
    .slice(0, 2)
    .join(".");

  if (classes) return `${el.tagName.toLowerCase()}.${classes}`;

  return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

/**
 * Wait for an element to appear
 */
async function waitForElement(selector: string, timeout: number): Promise<Element> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }

  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Log when script loads
console.info("[BrowserAI Craft] Content script loaded");
