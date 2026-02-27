import { vi } from "vitest";
import type { ActionResult, DOMState, BrowserAction } from "~types";

/**
 * Mock browser agent for testing
 */
export class MockBrowserAgent {
  private domState: DOMState = {
    url: "https://example.com",
    title: "Example Page",
    visibleElements: [],
    forms: [],
    canvasElements: [],
    iframes: [],
    timestamp: new Date().toISOString(),
  };

  /**
   * Set the mock DOM state
   */
  setDOMState(state: Partial<DOMState>): void {
    this.domState = { ...this.domState, ...state };
  }

  /**
   * Execute a browser action (mock)
   */
  async executeAction(action: BrowserAction): Promise<ActionResult> {
    const startTime = Date.now();

    // Simulate action execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get current DOM state
   */
  async getDOMState(): Promise<DOMState> {
    return this.domState;
  }

  /**
   * Capture screenshot (mock)
   */
  async captureScreenshot(): Promise<string> {
    return "data:image/png;base64,mockscreenshot";
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<ActionResult> {
    this.domState.url = url;
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 100,
    };
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.domState = {
      url: "https://example.com",
      title: "Example Page",
      visibleElements: [],
      forms: [],
      canvasElements: [],
      iframes: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create a mock browser agent
 */
export function createMockBrowserAgent(): MockBrowserAgent {
  return new MockBrowserAgent();
}

/**
 * Mock Chrome tabs API for testing
 */
export function setupMockChromeTabs(domState?: Partial<DOMState>): void {
  const state: DOMState = {
    url: domState?.url || "https://example.com",
    title: domState?.title || "Example Page",
    visibleElements: domState?.visibleElements || [],
    forms: domState?.forms || [],
    canvasElements: domState?.canvasElements || [],
    iframes: domState?.iframes || [],
    timestamp: new Date().toISOString(),
  };

  vi.mocked(chrome.tabs.query).mockResolvedValue([
    { id: 1, url: state.url, title: state.title } as chrome.tabs.Tab,
  ]);

  vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
    success: true,
    data: state,
    timestamp: new Date().toISOString(),
    duration: 50,
  });

  vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValue(
    "data:image/png;base64,mockscreenshot"
  );
}
