import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the Canva and Figma platform-specific content scripts
 * and the enhanced background service worker (Prompt 4.1).
 */

// ===========================================================================
// Canva Content Script
// ===========================================================================

describe("Canva Content Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CANVA_SELECTORS contains essential Canva selectors", async () => {
    const { CANVA_SELECTORS } = await import("../../src/contents/canva-injector");
    expect(CANVA_SELECTORS.canvas).toBe('canvas[role="img"]');
    expect(CANVA_SELECTORS.toolbar).toBe('[data-testid="toolbar"]');
    expect(CANVA_SELECTORS.sidebar).toBe('[data-testid="sidebar"]');
    expect(CANVA_SELECTORS.textElement).toBe('[data-text-element="true"]');
    expect(CANVA_SELECTORS.exportButton).toBe('[data-testid="export-button"]');
    expect(CANVA_SELECTORS.searchInput).toBe('[data-testid="search-input"]');
    expect(CANVA_SELECTORS.modal).toBe('[role="dialog"]');
  });

  it("CANVA_SELECTORS includes design surface and loading spinner", async () => {
    const { CANVA_SELECTORS } = await import("../../src/contents/canva-injector");
    expect(CANVA_SELECTORS.designSurface).toBe('[data-testid="design-surface"]');
    expect(CANVA_SELECTORS.loadingSpinner).toBe('[data-testid="loading-spinner"]');
  });

  it("registers a Chrome message listener on import", async () => {
    // Reset and re-import to trigger module side-effects
    vi.resetModules();
    const addListenerSpy = vi.mocked(chrome.runtime.onMessage.addListener);
    const callsBefore = addListenerSpy.mock.calls.length;

    await import("../../src/contents/canva-injector");

    expect(addListenerSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ===========================================================================
// Figma Content Script
// ===========================================================================

describe("Figma Content Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("FIGMA_SELECTORS contains essential Figma selectors", async () => {
    const { FIGMA_SELECTORS } = await import("../../src/contents/figma-injector");
    expect(FIGMA_SELECTORS.canvas).toBe('[class*="canvas"]');
    expect(FIGMA_SELECTORS.toolbar).toBe('[class*="toolbar"]');
    expect(FIGMA_SELECTORS.layersPanel).toBe('[class*="layers_panel"]');
    expect(FIGMA_SELECTORS.propertiesPanel).toBe('[class*="properties_panel"]');
    expect(FIGMA_SELECTORS.textLayer).toBe('[class*="text_layer"]');
    expect(FIGMA_SELECTORS.modal).toBe('[class*="modal"]');
  });

  it("FIGMA_SELECTORS includes export and zoom controls", async () => {
    const { FIGMA_SELECTORS } = await import("../../src/contents/figma-injector");
    expect(FIGMA_SELECTORS.exportButton).toBe('[class*="export"]');
    expect(FIGMA_SELECTORS.zoomControl).toBe('[class*="zoom"]');
  });

  it("registers a Chrome message listener on import", async () => {
    vi.resetModules();
    const addListenerSpy = vi.mocked(chrome.runtime.onMessage.addListener);
    const callsBefore = addListenerSpy.mock.calls.length;

    await import("../../src/contents/figma-injector");

    expect(addListenerSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ===========================================================================
// Enhanced Background Service Worker
// ===========================================================================

describe("Enhanced Background Service Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleMessage routes START_JOB correctly", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "START_JOB",
      payload: { prompt: "Create a design" },
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((response.data as any).status).toBe("queued");
  });

  it("handleMessage rejects empty prompt", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "START_JOB",
      payload: { prompt: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Prompt is required");
  });

  it("handleMessage routes GET_CONFIG correctly", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({ type: "GET_CONFIG" });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it("handleMessage returns error for unknown type", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await bg.handleMessage({ type: "UNKNOWN" as any });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Unknown message type");
  });

  it("handleMessage routes PAUSE_JOB with missing jobId", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "PAUSE_JOB",
      payload: { jobId: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Job ID is required");
  });

  it("handleMessage routes CANCEL_JOB with missing jobId", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "CANCEL_JOB",
      payload: { jobId: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Job ID is required");
  });

  it("handleMessage routes RESUME_JOB with missing jobId", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "RESUME_JOB",
      payload: { jobId: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Job ID is required");
  });

  it("handleMessage routes GET_JOB_STATUS with missing jobId", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    const response = await bg.handleMessage({
      type: "GET_JOB_STATUS",
      payload: { jobId: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Job ID is required");
  });

  it("initializeSystems can be called without error", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await expect(bg.initializeSystems()).resolves.toBeUndefined();
  });

  it("resumeInterruptedJobs can be called without error", async () => {
    vi.resetModules();
    const bg = await import("../../src/background/index");

    await bg.ensureInitialised();
    await expect(bg.resumeInterruptedJobs()).resolves.toBeUndefined();
  });
});

// ===========================================================================
// Manifest (package.json) configuration checks
// ===========================================================================

describe("Manifest Configuration", () => {
  it("package.json manifest has required permissions", async () => {
    const { readFileSync } = await import("fs");
    const pkg = JSON.parse(
      readFileSync("/home/runner/work/WebFlow-AI-Agent/WebFlow-AI-Agent/package.json", "utf-8")
    );

    const permissions: string[] = pkg.manifest.permissions;
    expect(permissions).toContain("tabs");
    expect(permissions).toContain("storage");
    expect(permissions).toContain("activeTab");
    expect(permissions).toContain("scripting");
    expect(permissions).toContain("sidePanel");
    expect(permissions).toContain("downloads");
    expect(permissions).toContain("identity");
  });

  it("package.json manifest has Canva, Figma, and Google Sheets host permissions", async () => {
    const { readFileSync } = await import("fs");
    const pkg = JSON.parse(
      readFileSync("/home/runner/work/WebFlow-AI-Agent/WebFlow-AI-Agent/package.json", "utf-8")
    );

    const hostPerms: string[] = pkg.manifest.host_permissions;
    expect(hostPerms.some((h: string) => h.includes("canva.com"))).toBe(true);
    expect(hostPerms.some((h: string) => h.includes("figma.com"))).toBe(true);
    expect(hostPerms.some((h: string) => h.includes("sheets.googleapis.com"))).toBe(true);
    expect(hostPerms.some((h: string) => h.includes("localhost"))).toBe(true);
  });

  it("package.json manifest has CSP and web_accessible_resources", async () => {
    const { readFileSync } = await import("fs");
    const pkg = JSON.parse(
      readFileSync("/home/runner/work/WebFlow-AI-Agent/WebFlow-AI-Agent/package.json", "utf-8")
    );

    expect(pkg.manifest.content_security_policy).toBeDefined();
    expect(pkg.manifest.content_security_policy.extension_pages).toContain("script-src 'self'");
    expect(pkg.manifest.web_accessible_resources).toBeDefined();
    expect(pkg.manifest.web_accessible_resources.length).toBeGreaterThan(0);
  });
});
