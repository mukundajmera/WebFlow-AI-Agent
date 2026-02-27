/**
 * High-level interface for all browser automation.
 * Wraps Chrome extension APIs and MCP tool calls into a single,
 * easy-to-consume surface for the orchestration layer.
 */

import type { Coordinates, ElementSelector, ActionResult } from "~types/common";
import type {
  BrowserAction,
  ActionOptions,
  WaitCondition,
  DOMState,
} from "~types/browser";
import type { Screenshot, ScreenshotOptions, ElementLocation, DetectedElement, VerificationResult } from "~types/vision";
import type { MCPIntegration } from "./MCPIntegration";

/** Options specific to the `type` action. */
interface TypeOptions {
  /** Timeout in milliseconds. */
  timeout?: number;
  /** Number of retries on failure. */
  retries?: number;
  /** Wait time after action (ms). */
  waitAfter?: number;
  /** Scroll element into view before action. */
  scrollIntoView?: boolean;
  /** Clear existing content before typing. */
  clearFirst?: boolean;
  /** Delay between keystrokes in ms. */
  delay?: number;
}

/** Minimal vision-agent contract to avoid circular dependencies. */
interface IVisionAgent {
  locateElement(screenshot: string, description: string): Promise<ElementLocation>;
  detectElements(screenshot: string): Promise<DetectedElement[]>;
  verify(screenshot: string, verificationPrompt: string): Promise<VerificationResult>;
}

/** Configuration accepted by the BrowserAgent constructor. */
interface BrowserAgentConfig {
  defaultTimeout?: number;
  retryAttempts?: number;
  slowMode?: boolean;
}

/**
 * Central façade for driving the browser.
 *
 * All page-level interactions go through Chrome extension APIs
 * (`chrome.tabs.*`, `chrome.tabs.sendMessage`) while MCP actions
 * are delegated to the supplied {@link MCPIntegration} instance.
 */
export class BrowserAgent {
  readonly mcp: MCPIntegration;
  private config: Required<BrowserAgentConfig>;

  constructor(mcp: MCPIntegration, config?: BrowserAgentConfig) {
    this.mcp = mcp;
    this.config = {
      defaultTimeout: config?.defaultTimeout ?? 30_000,
      retryAttempts: config?.retryAttempts ?? 3,
      slowMode: config?.slowMode ?? false,
    };
  }

  // ─── Tab helpers ──────────────────────────────────────────────────

  /** Get the URL of the currently active tab. */
  async getCurrentPageUrl(): Promise<string> {
    const tab = await this.getCurrentTab();
    return tab.url ?? "";
  }

  /** Get the active tab object, throwing if none is available. */
  async getCurrentTab(): Promise<chrome.tabs.Tab> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length || !tabs[0]) {
      throw new Error("No active tab found");
    }
    return tabs[0];
  }

  // ─── Screenshot ───────────────────────────────────────────────────

  /** Capture a screenshot of the visible viewport. */
  async captureScreenshot(options?: ScreenshotOptions): Promise<Screenshot> {
    try {
      const format = options?.format ?? "png";
      const quality = format === "jpeg" ? (options?.quality ?? 80) : undefined;

      const dataUrl = await chrome.tabs.captureVisibleTab({
        format,
        quality,
      });

      // Strip the data-URL prefix to get raw base64
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

      return {
        data: base64,
        format,
        width: options?.maxWidth ?? 0,
        height: 0,
        timestamp: new Date().toISOString(),
        isCompressed: format === "jpeg",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Screenshot capture failed: ${message}`);
    }
  }

  // ─── DOM state ────────────────────────────────────────────────────

  /** Retrieve the full DOM state from the content script. */
  async getDOMState(): Promise<DOMState> {
    const tab = await this.getCurrentTab();
    const response = await this.sendToContentScript(tab.id!, {
      action: "getDOMState",
    });

    if (!response || response.error) {
      throw new Error(response?.error ?? "Failed to get DOM state");
    }

    return response.data as DOMState;
  }

  // ─── Actions ──────────────────────────────────────────────────────

  /**
   * Click an element identified by a CSS selector or page coordinates.
   */
  async click(
    target: string | Coordinates,
    options?: ActionOptions,
  ): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();

      if (typeof target === "string") {
        if (options?.scrollIntoView) {
          await this.sendToContentScript(tab.id!, {
            action: "scrollIntoView",
            selector: target,
          });
        }
        await this.sendToContentScript(tab.id!, {
          action: "click",
          selector: target,
        });
      } else {
        await this.sendToContentScript(tab.id!, {
          action: "clickCoordinates",
          x: target.x,
          y: target.y,
        });
      }

      if (options?.waitAfter) {
        await this.delay(options.waitAfter);
      }

      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Type text into the element identified by {@link selector}. */
  async type(
    selector: string,
    text: string,
    options?: TypeOptions,
  ): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();

      if (options?.clearFirst) {
        await this.sendToContentScript(tab.id!, {
          action: "clearInput",
          selector,
        });
      }

      await this.sendToContentScript(tab.id!, {
        action: "type",
        selector,
        text,
        delay: options?.delay,
      });

      if (options?.waitAfter) {
        await this.delay(options.waitAfter);
      }

      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Click at coordinates then type text. */
  async typeAtCoordinates(
    coords: Coordinates,
    text: string,
  ): Promise<ActionResult> {
    const clickResult = await this.click(coords);
    if (!clickResult.success) return clickResult;

    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();
      await this.sendToContentScript(tab.id!, {
        action: "typeAtActiveElement",
        text,
      });
      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Upload a file to a file-input element. */
  async uploadFile(selector: string, filePath: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();
      await this.sendToContentScript(tab.id!, {
        action: "uploadFile",
        selector,
        filePath,
      });
      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /**
   * Wait for a condition to be satisfied.
   */
  async wait(
    condition: WaitCondition,
    options?: { timeout?: number },
  ): Promise<ActionResult> {
    const timeout = options?.timeout ?? this.config.defaultTimeout;
    const start = Date.now();

    try {
      const tab = await this.getCurrentTab();

      switch (condition.type) {
        case "timeout":
          await this.delay(condition.duration);
          break;

        case "element_visible":
        case "element_hidden":
        case "text_visible":
        case "network_idle":
        case "url_match":
          await this.sendToContentScript(tab.id!, {
            action: "wait",
            condition,
            timeout,
          });
          break;

        default:
          return this.fail(new Error(`Unknown wait condition: ${(condition as any).type}`), start);
      }

      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Navigate the active tab to a URL. */
  async navigate(url: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();
      await chrome.tabs.update(tab.id!, { url });
      await this.waitForPageLoad();
      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Scroll the page or scroll to a specific element. */
  async scroll(
    direction: "up" | "down" | "to_element",
    amount?: number | string,
  ): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();

      if (direction === "to_element" && typeof amount === "string") {
        await this.sendToContentScript(tab.id!, {
          action: "scrollToElement",
          selector: amount,
        });
      } else {
        await this.sendToContentScript(tab.id!, {
          action: "scroll",
          direction,
          amount: typeof amount === "number" ? amount : 300,
        });
      }

      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Hover over an element or coordinates. */
  async hover(target: string | Coordinates): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();

      if (typeof target === "string") {
        await this.sendToContentScript(tab.id!, {
          action: "hover",
          selector: target,
        });
      } else {
        await this.sendToContentScript(tab.id!, {
          action: "hoverCoordinates",
          x: target.x,
          y: target.y,
        });
      }

      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Simulate a key press, optionally with modifier keys. */
  async pressKey(key: string, modifiers?: string[]): Promise<ActionResult> {
    const start = Date.now();
    try {
      const tab = await this.getCurrentTab();
      await this.sendToContentScript(tab.id!, {
        action: "pressKey",
        key,
        modifiers: modifiers ?? [],
      });
      return this.ok(start);
    } catch (error) {
      return this.fail(error, start);
    }
  }

  /** Evaluate arbitrary JavaScript in the page context. */
  async evaluate(script: string): Promise<any> {
    const tab = await this.getCurrentTab();
    const result = await this.sendToContentScript(tab.id!, {
      action: "evaluate",
      script,
    });

    if (result?.error) {
      throw new Error(`evaluate failed: ${result.error}`);
    }
    return result?.data;
  }

  // ─── Generic action router ───────────────────────────────────────

  /**
   * Route a generic {@link BrowserAction} to the appropriate method.
   */
  async executeAction(action: BrowserAction): Promise<ActionResult> {
    switch (action.type) {
      case "click": {
        const target = action.target;
        if (!target) return this.fail(new Error("Click action requires a target"), Date.now());
        if (target.type === "css") return this.click(target.selector, action.options);
        if (target.type === "coordinates") return this.click({ x: target.x, y: target.y }, action.options);
        if (target.type === "semantic") return this.click(target.description, action.options);
        return this.fail(new Error("Unknown target type"), Date.now());
      }

      case "type": {
        const typed = action as any;
        const selector =
          action.target?.type === "css" ? action.target.selector : String(action.target ?? "");
        return this.type(selector, typed.text ?? String(action.value ?? ""), action.options);
      }

      case "navigate": {
        const nav = action as any;
        return this.navigate(nav.url ?? String(action.value ?? ""));
      }

      case "wait": {
        const w = action as any;
        return this.wait(w.condition, { timeout: w.timeout ?? action.options?.timeout });
      }

      case "scroll": {
        const s = action as any;
        return this.scroll(s.direction ?? "down", s.amount);
      }

      case "hover": {
        const target = action.target;
        if (!target) return this.fail(new Error("Hover action requires a target"), Date.now());
        if (target.type === "css") return this.hover(target.selector);
        if (target.type === "coordinates") return this.hover({ x: target.x, y: target.y });
        return this.hover(target.description);
      }

      case "press_key": {
        const k = action as any;
        return this.pressKey(k.key ?? String(action.value ?? ""), k.modifiers);
      }

      case "upload": {
        const u = action as any;
        const sel = action.target?.type === "css" ? action.target.selector : "";
        return this.uploadFile(sel, u.filePath ?? String(action.value ?? ""));
      }

      case "screenshot": {
        try {
          await this.captureScreenshot();
          return this.ok(Date.now());
        } catch (error) {
          return this.fail(error, Date.now());
        }
      }

      case "evaluate": {
        try {
          const data = await this.evaluate(String(action.value ?? ""));
          return { success: true, data, timestamp: new Date().toISOString(), duration: 0 };
        } catch (error) {
          return this.fail(error, Date.now());
        }
      }

      default:
        return this.fail(
          new Error(`Unsupported action type: ${(action as any).type}`),
          Date.now(),
        );
    }
  }

  // ─── Self-healing wrappers ────────────────────────────────────────

  /**
   * Attempt multiple strategies to find an element:
   * 1. CSS selector
   * 2. Attribute variations (data-testid, aria-label)
   * 3. Vision-based location via the supplied VisionAgent
   */
  async findElementWithHealing(
    selector: string,
    description: string,
    visionAgent: IVisionAgent,
  ): Promise<ElementSelector> {
    // Strategy 1 — direct CSS
    try {
      const visible = await this.isElementVisible(selector);
      if (visible) {
        return { type: "css", selector };
      }
    } catch {
      // fall through
    }

    // Strategy 2 — attribute variations
    const variations = this.generateSelectorVariations(selector);
    for (const alt of variations) {
      try {
        const visible = await this.isElementVisible(alt);
        if (visible) {
          console.info("[BrowserAgent] Healed selector:", selector, "→", alt);
          return { type: "css", selector: alt };
        }
      } catch {
        // continue
      }
    }

    // Strategy 3 — vision-based
    try {
      const screenshot = await this.captureScreenshot();
      const location = await visionAgent.locateElement(screenshot.data, description);
      if (location.found && location.bbox) {
        const coords: Coordinates = {
          x: location.bbox.x + location.bbox.width / 2,
          y: location.bbox.y + location.bbox.height / 2,
        };
        console.info("[BrowserAgent] Found element visually at:", coords);
        return { type: "coordinates", ...coords };
      }
    } catch (error) {
      console.debug("[BrowserAgent] Vision fallback failed:", error);
    }

    throw new Error(
      `Element not found after healing: selector="${selector}", description="${description}"`,
    );
  }

  /**
   * Click with self-healing: retries, attribute variations, then vision.
   */
  async clickWithHealing(
    target: ElementSelector,
    description: string,
    visionAgent: IVisionAgent,
  ): Promise<ActionResult> {
    // First attempt
    const firstResult =
      target.type === "css"
        ? await this.click(target.selector)
        : target.type === "coordinates"
          ? await this.click({ x: target.x, y: target.y })
          : await this.click(target.description);

    if (firstResult.success) return firstResult;

    // Heal and retry
    const selectorStr =
      target.type === "css"
        ? target.selector
        : target.type === "semantic"
          ? target.description
          : `[${target.x},${target.y}]`;

    console.info("[BrowserAgent] Click failed, attempting healing for:", selectorStr);

    const healed = await this.findElementWithHealing(selectorStr, description, visionAgent);
    if (healed.type === "css") return this.click(healed.selector);
    if (healed.type === "coordinates") return this.click({ x: healed.x, y: healed.y });
    return this.click(healed.description);
  }

  /**
   * Type with self-healing: if the selector breaks, heal and retry.
   */
  async typeWithHealing(
    selector: string,
    text: string,
    visionAgent: IVisionAgent,
  ): Promise<ActionResult> {
    const firstResult = await this.type(selector, text);
    if (firstResult.success) return firstResult;

    console.info("[BrowserAgent] Type failed, attempting healing for:", selector);

    const healed = await this.findElementWithHealing(
      selector,
      `text input: ${selector}`,
      visionAgent,
    );

    if (healed.type === "css") return this.type(healed.selector, text);
    if (healed.type === "coordinates") return this.typeAtCoordinates({ x: healed.x, y: healed.y }, text);
    return this.type(healed.description, text);
  }

  // ─── Utilities ────────────────────────────────────────────────────

  /** Wait for the active tab to finish loading. */
  async waitForPageLoad(): Promise<void> {
    const tab = await this.getCurrentTab();
    if (tab.status === "complete") return;

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, this.config.defaultTimeout);

      const listener = (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo,
      ): void => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  /** Check whether an element matching the selector is visible in the page. */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const tab = await this.getCurrentTab();
      const response = await this.sendToContentScript(tab.id!, {
        action: "isElementVisible",
        selector,
      });
      return response?.data === true;
    } catch {
      return false;
    }
  }

  /**
   * Wait until an element matching {@link selector} appears, or timeout.
   */
  async waitForSelector(selector: string, timeout?: number): Promise<boolean> {
    const maxWait = timeout ?? this.config.defaultTimeout;
    const pollInterval = 100;
    const deadline = Date.now() + maxWait;

    while (Date.now() < deadline) {
      const visible = await this.isElementVisible(selector);
      if (visible) return true;
      await this.delay(pollInterval);
    }

    return false;
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /** Send a message to the content script running in the given tab. */
  private async sendToContentScript(
    tabId: number,
    message: Record<string, unknown>,
  ): Promise<any> {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Content script communication failed: ${msg}`);
    }
  }

  /** Generate CSS selector variations for healing attempts. */
  private generateSelectorVariations(selector: string): string[] {
    const variations: string[] = [];

    // Extract tag from selector (e.g. "button.foo" → "button")
    const tagMatch = selector.match(/^(\w+)/);
    const tag = tagMatch ? tagMatch[1] : "*";

    // Attribute-based variations
    const idMatch = selector.match(/#([\w-]+)/);
    if (idMatch) {
      variations.push(`[data-testid="${idMatch[1]}"]`);
      variations.push(`[aria-label="${idMatch[1]}"]`);
      variations.push(`[name="${idMatch[1]}"]`);
    }

    // Class-based variation: use first class only
    const classMatch = selector.match(/\.([\w-]+)/);
    if (classMatch) {
      variations.push(`${tag}.${classMatch[1]}`);
      variations.push(`[class*="${classMatch[1]}"]`);
    }

    return variations;
  }

  /** Simple promise-based delay. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Build a successful {@link ActionResult}. */
  private ok(start: number): ActionResult {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
    };
  }

  /** Build a failed {@link ActionResult}. */
  private fail(error: unknown, start: number): ActionResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
    };
  }
}
