/**
 * Standalone utility functions for DOM interaction.
 * These helpers run in the extension context and operate on serialised
 * DOM representations received from content scripts.
 */

import type { VisibleElement, CanvasElement } from "~types/browser";

/** Tags that are inherently interactive. */
const INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "details",
  "summary",
]);

/** Attributes that make any element interactive. */
const INTERACTIVE_ATTRIBUTES = new Set([
  "onclick",
  "onkeydown",
  "onkeyup",
  "onmousedown",
  "tabindex",
  "contenteditable",
  "role",
]);

/** Roles that are considered interactive. */
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "textbox",
  "combobox",
  "slider",
  "spinbutton",
]);

/**
 * Build a CSS selector string for the given element description.
 * If a context selector is provided the result is scoped to that ancestor.
 *
 * @param element - A tag name, #id, .class, or attribute selector fragment.
 * @param context - Optional ancestor selector to scope the result.
 * @returns A valid CSS selector string.
 */
export function buildSelector(element: string, context?: string): string {
  const trimmed = element.trim();
  if (!trimmed) {
    return context ?? "*";
  }

  // Already looks like a valid selector — pass through
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith(".") ||
    trimmed.startsWith("[") ||
    trimmed.includes(" ") ||
    trimmed.includes(">")
  ) {
    return context ? `${context} ${trimmed}` : trimmed;
  }

  // Bare tag name
  const selector = trimmed.toLowerCase();
  return context ? `${context} ${selector}` : selector;
}

/**
 * Poll the DOM for an element matching {@link selector} until it appears or
 * the timeout elapses. Designed to run inside a content-script context.
 *
 * @param selector - CSS selector to wait for.
 * @param timeout - Maximum wait time in milliseconds.
 * @returns `true` if the element was found, `false` on timeout.
 */
export async function waitForSelector(
  selector: string,
  timeout: number,
): Promise<boolean> {
  const pollInterval = 100;
  const deadline = Date.now() + timeout;

  return new Promise<boolean>((resolve) => {
    const check = (): void => {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(check, pollInterval);
    };
    check();
  });
}

/**
 * Parse an HTML string and extract visible, interactive elements.
 *
 * @param html - Serialised HTML to parse.
 * @returns An array of {@link VisibleElement} descriptors.
 */
export function parseVisibleElements(html: string): VisibleElement[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements: VisibleElement[] = [];

  const allElements = doc.querySelectorAll("*");
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const tagName = htmlEl.tagName.toLowerCase();

    // Skip non-visible / structural-only tags
    if (["html", "head", "meta", "link", "script", "style", "br"].includes(tagName)) {
      return;
    }

    const attributes: Record<string, string> = {};
    for (const attr of Array.from(htmlEl.attributes)) {
      attributes[attr.name] = attr.value;
    }

    const interactive = isInteractive(tagName, attributes);
    const text = htmlEl.textContent?.trim().slice(0, 200) ?? "";

    elements.push({
      tagName,
      selector: getUniqueSelector({
        tagName,
        id: attributes["id"],
        className: attributes["class"],
        attributes,
      }),
      text,
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      attributes,
      isInteractive: interactive,
    });
  });

  return elements;
}

/**
 * Detect `<canvas>` elements in the current document.
 * Must be called inside a content-script context.
 *
 * @returns An array of {@link CanvasElement} descriptors.
 */
export function detectCanvasElements(): CanvasElement[] {
  const canvases = document.querySelectorAll("canvas");
  const results: CanvasElement[] = [];

  canvases.forEach((canvas, index) => {
    let renderingContext: CanvasElement["renderingContext"] = "unknown";
    try {
      if (canvas.getContext("2d")) renderingContext = "2d";
      else if (canvas.getContext("webgl2")) renderingContext = "webgl2";
      else if (canvas.getContext("webgl")) renderingContext = "webgl";
    } catch {
      // Context detection may throw in some browsers
    }

    const id = canvas.id ? `#${canvas.id}` : `canvas:nth-of-type(${index + 1})`;
    results.push({
      selector: id,
      width: canvas.width,
      height: canvas.height,
      renderingContext,
    });
  });

  return results;
}

/**
 * Determine whether an element is interactive based on its tag and attributes.
 *
 * @param tagName - Lowercase tag name.
 * @param attributes - Key-value map of the element's HTML attributes.
 */
export function isInteractive(
  tagName: string,
  attributes: Record<string, string>,
): boolean {
  if (INTERACTIVE_TAGS.has(tagName.toLowerCase())) return true;

  for (const attr of Object.keys(attributes)) {
    if (INTERACTIVE_ATTRIBUTES.has(attr)) return true;
  }

  const role = attributes["role"];
  if (role && INTERACTIVE_ROLES.has(role.toLowerCase())) return true;

  return false;
}

/**
 * Generate a reasonably unique CSS selector for the given element descriptor.
 *
 * @param element - Object describing the element.
 * @returns A CSS selector string.
 */
export function getUniqueSelector(element: {
  tagName: string;
  id?: string;
  className?: string;
  attributes?: Record<string, string>;
}): string {
  // Prefer ID when available
  if (element.id) {
    return `#${element.id}`;
  }

  const tag = element.tagName.toLowerCase();

  // data-testid is highly specific
  const testId = element.attributes?.["data-testid"];
  if (testId) {
    return `${tag}[data-testid="${testId}"]`;
  }

  // aria-label is a good fallback
  const ariaLabel = element.attributes?.["aria-label"];
  if (ariaLabel) {
    return `${tag}[aria-label="${ariaLabel}"]`;
  }

  // name attribute (common for form elements)
  const name = element.attributes?.["name"];
  if (name) {
    return `${tag}[name="${name}"]`;
  }

  // Use classes if they look specific enough (not utility-only)
  if (element.className) {
    const classes = element.className
      .split(/\s+/)
      .filter((c) => c.length > 0)
      .slice(0, 3);
    if (classes.length > 0) {
      return `${tag}.${classes.join(".")}`;
    }
  }

  // Bare tag fallback
  return tag;
}
