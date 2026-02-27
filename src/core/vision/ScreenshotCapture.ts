/**
 * ScreenshotCapture — Utility functions for capturing and manipulating
 * screenshots in a Chrome extension context.
 *
 * NOTE: Canvas operations currently use `document.createElement('canvas')`.
 * In a service-worker context, replace with `OffscreenCanvas` for
 * compatibility.
 */

import type { BoundingBox } from "~types/common";
import type { Screenshot } from "~types/vision";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Annotation drawn onto a screenshot (bounding box + label). */
export interface Annotation {
  bbox: BoundingBox;
  label: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a base64 data-URL into an HTMLImageElement. */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Image load failed: ${err}`));
    img.src = dataUrl.startsWith("data:") ? dataUrl : `data:image/png;base64,${dataUrl}`;
  });
}

/** Ensure a base64 string is returned without the data-URL prefix. */
function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.substring(idx + 1) : dataUrl;
}

/** Get a 2D context from a canvas, throwing on failure. */
function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to obtain 2D canvas context.");
  return ctx;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Capture the full page by scrolling and stitching viewport captures.
 *
 * Uses `chrome.tabs.captureVisibleTab` for each viewport slice and composites
 * them onto a single canvas.
 */
export async function captureFullPage(): Promise<Screenshot> {
  console.info("[ScreenshotCapture] captureFullPage");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");

  // Gather page dimensions via the content script / executeScript
  const [{ result: dims }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }),
  });

  if (!dims) throw new Error("Unable to read page dimensions.");

  const { scrollHeight, viewportHeight, viewportWidth } = dims;
  const slices = Math.ceil(scrollHeight / viewportHeight);

  const canvas = document.createElement("canvas");
  canvas.width = viewportWidth;
  canvas.height = scrollHeight;
  const ctx = getContext(canvas);

  for (let i = 0; i < slices; i++) {
    const scrollY = i * viewportHeight;

    // Scroll the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (y: number) => window.scrollTo(0, y),
      args: [scrollY],
    });

    // Small delay for repaint
    await new Promise((r) => setTimeout(r, 150));

    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "png",
    });

    const img = await loadImage(dataUrl);
    ctx.drawImage(img, 0, scrollY);
  }

  const data = stripDataUrlPrefix(canvas.toDataURL("image/png"));

  return {
    data,
    format: "png",
    width: canvas.width,
    height: canvas.height,
    timestamp: new Date().toISOString(),
    isCompressed: false,
  };
}

/**
 * Capture only the currently visible viewport.
 */
export async function captureViewport(): Promise<Screenshot> {
  console.info("[ScreenshotCapture] captureViewport");

  const dataUrl = await chrome.tabs.captureVisibleTab({
    format: "png",
  });

  const img = await loadImage(dataUrl);

  return {
    data: stripDataUrlPrefix(dataUrl),
    format: "png",
    width: img.width,
    height: img.height,
    timestamp: new Date().toISOString(),
    isCompressed: false,
  };
}

/**
 * Capture a specific element by CSS selector.
 *
 * Takes a full viewport capture and crops to the element's bounding box.
 */
export async function captureElement(selector: string): Promise<Screenshot> {
  console.info("[ScreenshotCapture] captureElement –", selector);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");

  // Get element bounding rect
  const [{ result: rect }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    args: [selector],
  });

  if (!rect) throw new Error(`Element not found for selector: ${selector}`);

  const viewportShot = await captureViewport();
  const croppedData = await cropScreenshot(viewportShot.data, rect);

  return {
    data: croppedData,
    format: "png",
    width: rect.width,
    height: rect.height,
    timestamp: new Date().toISOString(),
    isCompressed: false,
  };
}

/**
 * Crop a base64 screenshot to the given bounding box.
 */
export async function cropScreenshot(
  screenshot: string,
  bbox: BoundingBox,
): Promise<string> {
  console.debug("[ScreenshotCapture] cropScreenshot");

  const img = await loadImage(
    screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`,
  );
  const canvas = document.createElement("canvas");
  canvas.width = bbox.width;
  canvas.height = bbox.height;
  const ctx = getContext(canvas);

  ctx.drawImage(
    img,
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    0,
    0,
    bbox.width,
    bbox.height,
  );

  return stripDataUrlPrefix(canvas.toDataURL("image/png"));
}

/**
 * Resize a screenshot maintaining aspect ratio.
 */
export async function resizeScreenshot(
  screenshot: string,
  maxWidth: number,
): Promise<string> {
  console.debug("[ScreenshotCapture] resizeScreenshot – maxWidth:", maxWidth);

  const img = await loadImage(
    screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`,
  );

  if (img.width <= maxWidth) return screenshot;

  const scale = maxWidth / img.width;
  const newWidth = maxWidth;
  const newHeight = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = getContext(canvas);
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  return stripDataUrlPrefix(canvas.toDataURL("image/png"));
}

/**
 * Compress a screenshot as JPEG with the given quality (0-1).
 */
export async function compressScreenshot(
  screenshot: string,
  quality: number,
): Promise<string> {
  console.debug("[ScreenshotCapture] compressScreenshot – quality:", quality);

  const img = await loadImage(
    screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`,
  );

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = getContext(canvas);
  ctx.drawImage(img, 0, 0);

  return stripDataUrlPrefix(canvas.toDataURL("image/jpeg", quality));
}

/**
 * Annotate a screenshot with bounding boxes and labels.
 */
export async function annotateScreenshot(
  screenshot: string,
  annotations: Annotation[],
): Promise<string> {
  console.debug(
    "[ScreenshotCapture] annotateScreenshot –",
    annotations.length,
    "annotations",
  );

  const img = await loadImage(
    screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`,
  );

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = getContext(canvas);
  ctx.drawImage(img, 0, 0);

  for (const ann of annotations) {
    const color = ann.color ?? "#FF0000";

    // Draw rectangle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(ann.bbox.x, ann.bbox.y, ann.bbox.width, ann.bbox.height);

    // Draw label background
    ctx.font = "12px sans-serif";
    const textMetrics = ctx.measureText(ann.label);
    const labelHeight = 16;
    ctx.fillStyle = color;
    ctx.fillRect(
      ann.bbox.x,
      ann.bbox.y - labelHeight,
      textMetrics.width + 6,
      labelHeight,
    );

    // Draw label text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(ann.label, ann.bbox.x + 3, ann.bbox.y - 4);
  }

  return stripDataUrlPrefix(canvas.toDataURL("image/png"));
}
