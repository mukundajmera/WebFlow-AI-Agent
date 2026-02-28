/**
 * Universal Content Script Injector
 * Injected into all pages to enable browser automation.
 *
 * Implements the full set of actions from PROMPT 4.1:
 *  - getDOMState, click, type, wait, scroll, navigate, hover,
 *    evaluate, getComputedStyle, isVisible
 * Also supports port-based persistent connections.
 */

import type { ActionResult, BrowserAction, BoundingBox, WaitAction } from "~types";

// ── Message Types ──────────────────────────────────────────────────────────────

type ContentMessage =
  | { type: "EXECUTE_ACTION"; payload: BrowserAction }
  | { type: "GET_DOM_STATE" }
  | { type: "TAKE_SCREENSHOT"; payload?: { selector?: string } }
  | { type: "EVALUATE"; payload: { script: string } }
  | { type: "GET_COMPUTED_STYLE"; payload: { selector: string } }
  | { type: "IS_VISIBLE"; payload: { selector: string } };

// ── Port Connection ────────────────────────────────────────────────────────────

/**
 * Maintain a persistent port connection to the background script.
 * Falls back to one-shot messages if the port disconnects.
 */
let port: chrome.runtime.Port | null = null;

function connectPort(): void {
  try {
    port = chrome.runtime.connect({ name: "content-script" });

    port.onDisconnect.addListener(() => {
      port = null;
    });

    port.onMessage.addListener((message: ContentMessage) => {
      handleMessage(message).then((result) => {
        port?.postMessage(result);
      });
    });
  } catch {
    // Port connection may fail if the service worker isn't ready yet
    port = null;
  }
}

connectPort();

// ── One-shot Message Handler ───────────────────────────────────────────────────

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

    return true; // async response
  }
);

// ── Message Router ─────────────────────────────────────────────────────────────

async function handleMessage(message: ContentMessage): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    switch (message.type) {
      case "EXECUTE_ACTION":
        return await executeAction(message.payload, startTime);

      case "GET_DOM_STATE":
        return getDOMState(startTime);

      case "TAKE_SCREENSHOT":
        return {
          success: true,
          data: {
            message: "Screenshot capture is handled by background script",
            selector: message.payload?.selector,
          },
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        };

      case "EVALUATE":
        return executeEvaluate(message.payload.script, startTime);

      case "GET_COMPUTED_STYLE":
        return executeGetComputedStyle(message.payload.selector, startTime);

      case "IS_VISIBLE":
        return executeIsVisible(message.payload.selector, startTime);

      default:
        return {
          success: false,
          error: "Unknown message type",
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

// ── Action Dispatcher ──────────────────────────────────────────────────────────

async function executeAction(action: BrowserAction, startTime: number): Promise<ActionResult> {
  switch (action.type) {
    case "click":
      return executeClick(action, startTime);
    case "type":
      return executeType(action, startTime);
    case "wait":
      return executeWait(action, startTime);
    case "scroll":
      return executeScroll(action, startTime);
    case "navigate":
      return executeNavigate(action, startTime);
    case "hover":
      return executeHover(action, startTime);
    case "evaluate":
      return executeEvaluate(String(action.value ?? ""), startTime);
    default:
      return fail(`Unsupported action type: ${action.type}`, startTime);
  }
}

// ── Click ──────────────────────────────────────────────────────────────────────

async function executeClick(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    const element = findElement(action.target);
    if (!element) {
      return fail("Element not found", startTime);
    }

    if (action.options?.scrollIntoView !== false) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(100);
    }

    (element as HTMLElement).click();

    if (action.options?.waitAfter) {
      await sleep(action.options.waitAfter);
    }

    return ok(undefined, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Type ───────────────────────────────────────────────────────────────────────

async function executeType(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    const element = findElement(action.target);
    if (
      !element ||
      !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    ) {
      return fail("Input element not found", startTime);
    }

    type TypeActionPayload = { clearFirst?: boolean; value?: unknown; text?: string };
    const typeAction = action as TypeActionPayload;

    if (typeAction.clearFirst) {
      element.value = "";
    }

    let textToType = "";
    if (typeof typeAction.value === "string") {
      textToType = typeAction.value;
    } else if (typeof typeAction.text === "string") {
      textToType = typeAction.text;
    }

    element.focus();
    element.value = textToType;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    if (action.options?.waitAfter) {
      await sleep(action.options.waitAfter);
    }

    return ok(undefined, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Wait ───────────────────────────────────────────────────────────────────────

async function executeWait(action: BrowserAction, startTime: number): Promise<ActionResult> {
  const waitAction = action as WaitAction;
  const condition = waitAction.condition;

  if (!condition) {
    return fail("Wait condition not specified", startTime);
  }

  const timeout = waitAction.timeout || action.options?.timeout || 30000;

  try {
    switch (condition.type) {
      case "timeout":
        await sleep(condition.duration || 1000);
        break;

      case "element_visible":
        await waitForElement(condition.selector || "", timeout);
        break;

      case "element_hidden":
        await waitForElementHidden(condition.selector || "", timeout);
        break;

      case "text_visible":
        await waitForText(condition.text || "", timeout);
        break;

      case "url_match":
        await waitForUrl(condition.pattern || "", timeout);
        break;

      default:
        return fail(`Unknown wait condition: ${condition.type}`, startTime);
    }

    return ok(undefined, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Scroll ─────────────────────────────────────────────────────────────────────

async function executeScroll(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    type ScrollPayload = { direction?: string; amount?: number; toElement?: boolean };
    const scrollAction = action as ScrollPayload;

    // Scroll to a specific element
    if (scrollAction.toElement && action.target) {
      const element = findElement(action.target);
      if (!element) return fail("Scroll target element not found", startTime);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(300);
      return ok(undefined, startTime);
    }

    // Directional scroll
    const amount = scrollAction.amount ?? 300;
    const scrollMap: Record<string, [number, number]> = {
      up: [0, -amount],
      down: [0, amount],
      left: [-amount, 0],
      right: [amount, 0],
    };
    const [x, y] = scrollMap[scrollAction.direction ?? "down"] ?? [0, amount];

    window.scrollBy({ left: x, top: y, behavior: "smooth" });
    await sleep(300);

    return ok(undefined, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Navigate ───────────────────────────────────────────────────────────────────

function executeNavigate(action: BrowserAction, startTime: number): ActionResult {
  try {
    type NavPayload = { url?: string };
    const url =
      (action as NavPayload).url ?? (typeof action.value === "string" ? action.value : "");

    if (!url) return fail("Navigation URL not specified", startTime);

    window.location.href = url;
    return ok({ url }, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Hover ──────────────────────────────────────────────────────────────────────

async function executeHover(action: BrowserAction, startTime: number): Promise<ActionResult> {
  try {
    const element = findElement(action.target);
    if (!element) return fail("Hover target element not found", startTime);

    if (action.options?.scrollIntoView !== false) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(100);
    }

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    element.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true, clientX: x, clientY: y })
    );
    element.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true, clientX: x, clientY: y })
    );

    if (action.options?.waitAfter) {
      await sleep(action.options.waitAfter);
    }

    return ok(undefined, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── Evaluate ───────────────────────────────────────────────────────────────────

function executeEvaluate(script: string, startTime: number): ActionResult {
  if (!script) return fail("Script not provided", startTime);

  try {
    // Use Function constructor to evaluate in the page context
    // eslint-disable-next-line no-new-func
    const fn = new Function(script);
    const result = fn();
    return ok({ result: result !== undefined ? String(result) : undefined }, startTime);
  } catch (error) {
    return fail(String(error), startTime);
  }
}

// ── getComputedStyle ───────────────────────────────────────────────────────────

function executeGetComputedStyle(selector: string, startTime: number): ActionResult {
  if (!selector) return fail("Selector not provided", startTime);

  const element = document.querySelector(selector);
  if (!element) return fail(`Element not found: ${selector}`, startTime);

  const style = window.getComputedStyle(element);

  // Return commonly needed properties
  const properties: Record<string, string> = {};
  const keys = [
    "display",
    "visibility",
    "opacity",
    "color",
    "backgroundColor",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "width",
    "height",
    "position",
    "zIndex",
    "overflow",
    "margin",
    "padding",
    "border",
  ];
  for (const key of keys) {
    properties[key] = style.getPropertyValue(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
  }

  return ok(properties, startTime);
}

// ── isVisible ──────────────────────────────────────────────────────────────────

function executeIsVisible(selector: string, startTime: number): ActionResult {
  if (!selector) return fail("Selector not provided", startTime);

  const element = document.querySelector(selector);
  if (!element) return ok({ visible: false, reason: "Element not found" }, startTime);

  const visible = isElementVisible(element);
  return ok({ visible }, startTime);
}

// ── DOM State Extraction ───────────────────────────────────────────────────────

function getDOMState(startTime: number): ActionResult {
  const state = {
    url: window.location.href,
    title: document.title,
    visibleElements: getVisibleElements(),
    forms: getForms(),
    canvasElements: getCanvasElements(),
    iframes: getIframes(),
    timestamp: new Date().toISOString(),
  };

  return ok(state, startTime);
}

// ── Element Finding ────────────────────────────────────────────────────────────

function findElement(
  target?: { type: string; selector?: string; x?: number; y?: number }
): Element | null {
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

// ── Visible Elements ───────────────────────────────────────────────────────────

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
      const attributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }

      elements.push({
        tagName: el.tagName.toLowerCase(),
        selector: generateSelector(el, index),
        text: (el.textContent || "").trim().substring(0, 100),
        bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        attributes,
        isInteractive: true,
      });
    }
  });

  return elements.slice(0, 100);
}

// ── Form Extraction ────────────────────────────────────────────────────────────

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

// ── Canvas Element Extraction ──────────────────────────────────────────────────

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

// ── IFrame Extraction ──────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateSelector(el: Element, index: number): string {
  if (el.id) return `#${el.id}`;

  const classes = Array.from(el.classList)
    .filter((c) => !c.includes("__"))
    .slice(0, 2)
    .join(".");

  if (classes) return `${el.tagName.toLowerCase()}.${classes}`;

  return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

async function waitForElement(selector: string, timeout: number): Promise<Element> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

async function waitForElementHidden(selector: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (!element || !isElementVisible(element)) return;
    await sleep(100);
  }
  throw new Error(`Element ${selector} still visible after ${timeout}ms`);
}

async function waitForText(text: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (document.body.textContent?.includes(text)) return;
    await sleep(100);
  }
  throw new Error(`Text "${text}" not found within ${timeout}ms`);
}

async function waitForUrl(pattern: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  const regex = new RegExp(pattern);
  while (Date.now() - startTime < timeout) {
    if (regex.test(window.location.href)) return;
    await sleep(100);
  }
  throw new Error(`URL did not match pattern "${pattern}" within ${timeout}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok(data: unknown, startTime: number): ActionResult {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

function fail(error: string, startTime: number): ActionResult {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

// ── Initialisation ─────────────────────────────────────────────────────────────

console.info("[BrowserAI Craft] Content script loaded");
