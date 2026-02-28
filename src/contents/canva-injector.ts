/**
 * Canva Content Script Injector
 * Platform-specific helpers for automating the Canva design editor.
 *
 * Injected into canva.com pages alongside the generic universal injector.
 * Provides Canva-aware DOM queries, text element selection, and
 * canvas element introspection.
 */

import type { ActionResult } from "~types/common";

// ---------------------------------------------------------------------------
// Canva-specific selectors
// ---------------------------------------------------------------------------

const CANVA_SELECTORS = {
  canvas: 'canvas[role="img"]',
  toolbar: '[data-testid="toolbar"]',
  sidebar: '[data-testid="sidebar"]',
  textElement: '[data-text-element="true"]',
  textButton: '[data-testid="text-button"]',
  imagesButton: '[data-testid="images-button"]',
  elementsButton: '[data-testid="elements-button"]',
  uploadButton: '[data-testid="upload-button"]',
  exportButton: '[data-testid="export-button"]',
  downloadButton: '[data-testid="download-button"]',
  searchInput: '[data-testid="search-input"]',
  templateCard: '[data-testid="template-item"]',
  modal: '[role="dialog"]',
  modalClose: '[data-testid="modal-close"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  designSurface: '[data-testid="design-surface"]',
} as const;

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

interface CanvaMessage {
  platform: "canva";
  customAction: string;
  index?: number;
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: CanvaMessage, _sender, sendResponse: (response: ActionResult) => void) => {
    if (message.platform !== "canva") return false;

    handleCanvaMessage(message)
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

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleCanvaMessage(message: CanvaMessage): Promise<ActionResult> {
  const startTime = Date.now();

  switch (message.customAction) {
    case "selectTextElement":
      return selectTextElement(message.index ?? 0, startTime);

    case "getCanvasElements":
      return getCanvasElements(startTime);

    case "getEditorState":
      return getEditorState(startTime);

    case "waitForCanvas":
      return waitForCanvas(startTime);

    default:
      return {
        success: false,
        error: `Unknown Canva action: ${message.customAction}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
  }
}

// ---------------------------------------------------------------------------
// Canva-specific actions
// ---------------------------------------------------------------------------

/**
 * Click a text element in the Canva editor by its index.
 */
function selectTextElement(index: number, startTime: number): ActionResult {
  const elements = document.querySelectorAll(CANVA_SELECTORS.textElement);

  if (index < 0 || index >= elements.length) {
    return {
      success: false,
      error: `Text element at index ${index} not found (${elements.length} available)`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }

  (elements[index] as HTMLElement).click();

  return {
    success: true,
    data: { index, total: elements.length },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Return key Canva UI landmarks (canvas, toolbar, sidebar).
 */
function getCanvasElements(startTime: number): ActionResult {
  const canvas = document.querySelector(CANVA_SELECTORS.canvas);
  const toolbar = document.querySelector(CANVA_SELECTORS.toolbar);
  const sidebar = document.querySelector(CANVA_SELECTORS.sidebar);

  return {
    success: true,
    data: {
      hasCanvas: !!canvas,
      hasToolbar: !!toolbar,
      hasSidebar: !!sidebar,
      textElementCount: document.querySelectorAll(CANVA_SELECTORS.textElement).length,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Snapshot the current Canva editor state.
 */
function getEditorState(startTime: number): ActionResult {
  const designSurface = document.querySelector(CANVA_SELECTORS.designSurface);
  const modal = document.querySelector(CANVA_SELECTORS.modal);
  const loading = document.querySelector(CANVA_SELECTORS.loadingSpinner);

  return {
    success: true,
    data: {
      url: window.location.href,
      hasDesignSurface: !!designSurface,
      isModalOpen: !!modal,
      isLoading: !!loading,
      textElements: document.querySelectorAll(CANVA_SELECTORS.textElement).length,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Wait for the Canva canvas element to appear (up to 30 s).
 */
async function waitForCanvas(startTime: number): Promise<ActionResult> {
  const timeout = 30_000;
  const pollInterval = 500;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (document.querySelector(CANVA_SELECTORS.canvas)) {
      return {
        success: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  return {
    success: false,
    error: `Canvas element not found within ${timeout}ms`,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

console.info("[BrowserAI Craft] Canva content script loaded");

// Re-export selectors for testing
export { CANVA_SELECTORS };
