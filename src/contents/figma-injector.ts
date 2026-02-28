/**
 * Figma Content Script Injector
 * Platform-specific helpers for automating the Figma design editor.
 *
 * Injected into figma.com pages alongside the generic universal injector.
 * Provides Figma-aware DOM queries, layer/frame selection, and
 * design surface introspection.
 */

import type { ActionResult } from "~types/common";

// ---------------------------------------------------------------------------
// Figma-specific selectors
// ---------------------------------------------------------------------------

const FIGMA_SELECTORS = {
  canvas: '[class*="canvas"]',
  toolbar: '[class*="toolbar"]',
  layersPanel: '[class*="layers_panel"]',
  propertiesPanel: '[class*="properties_panel"]',
  pageSelector: '[class*="page_selector"]',
  textLayer: '[class*="text_layer"]',
  objectPanel: '[class*="object_panel"]',
  componentPanel: '[class*="component_panel"]',
  exportButton: '[class*="export"]',
  zoomControl: '[class*="zoom"]',
  modal: '[class*="modal"]',
  loadingOverlay: '[class*="loading"]',
} as const;

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

interface FigmaMessage {
  platform: "figma";
  customAction: string;
  index?: number;
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: FigmaMessage, _sender, sendResponse: (response: ActionResult) => void) => {
    if (message.platform !== "figma") return false;

    handleFigmaMessage(message)
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

async function handleFigmaMessage(message: FigmaMessage): Promise<ActionResult> {
  const startTime = Date.now();

  switch (message.customAction) {
    case "getEditorState":
      return getEditorState(startTime);

    case "getCanvasInfo":
      return getCanvasInfo(startTime);

    case "selectLayer":
      return selectLayer(message.index ?? 0, startTime);

    case "waitForCanvas":
      return waitForCanvas(startTime);

    default:
      return {
        success: false,
        error: `Unknown Figma action: ${message.customAction}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
  }
}

// ---------------------------------------------------------------------------
// Figma-specific actions
// ---------------------------------------------------------------------------

/**
 * Snapshot the current Figma editor state.
 */
function getEditorState(startTime: number): ActionResult {
  const canvas = document.querySelector(FIGMA_SELECTORS.canvas);
  const layers = document.querySelector(FIGMA_SELECTORS.layersPanel);
  const properties = document.querySelector(FIGMA_SELECTORS.propertiesPanel);
  const modal = document.querySelector(FIGMA_SELECTORS.modal);
  const loading = document.querySelector(FIGMA_SELECTORS.loadingOverlay);

  return {
    success: true,
    data: {
      url: window.location.href,
      hasCanvas: !!canvas,
      hasLayersPanel: !!layers,
      hasPropertiesPanel: !!properties,
      isModalOpen: !!modal,
      isLoading: !!loading,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Return key Figma UI landmarks.
 */
function getCanvasInfo(startTime: number): ActionResult {
  const canvas = document.querySelector(FIGMA_SELECTORS.canvas);
  const toolbar = document.querySelector(FIGMA_SELECTORS.toolbar);
  const layers = document.querySelector(FIGMA_SELECTORS.layersPanel);

  return {
    success: true,
    data: {
      hasCanvas: !!canvas,
      hasToolbar: !!toolbar,
      hasLayers: !!layers,
      textLayerCount: document.querySelectorAll(FIGMA_SELECTORS.textLayer).length,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Click a text layer in the Figma layers panel by its index.
 */
function selectLayer(index: number, startTime: number): ActionResult {
  const layers = document.querySelectorAll(FIGMA_SELECTORS.textLayer);

  if (index < 0 || index >= layers.length) {
    return {
      success: false,
      error: `Layer at index ${index} not found (${layers.length} available)`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }

  (layers[index] as HTMLElement).click();

  return {
    success: true,
    data: { index, total: layers.length },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Wait for the Figma canvas element to appear (up to 30 s).
 */
async function waitForCanvas(startTime: number): Promise<ActionResult> {
  const timeout = 30_000;
  const pollInterval = 500;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (document.querySelector(FIGMA_SELECTORS.canvas)) {
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

console.info("[BrowserAI Craft] Figma content script loaded");

// Re-export selectors for testing
export { FIGMA_SELECTORS };
