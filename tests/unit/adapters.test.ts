import { describe, it, expect, vi, beforeEach } from "vitest";
import { CanvaAdapter } from "../../src/adapters/CanvaAdapter";
import { FigmaAdapter } from "../../src/adapters/FigmaAdapter";
import { GenericWebAdapter } from "../../src/adapters/GenericWebAdapter";
import { AdapterRegistry } from "../../src/adapters/AdapterRegistry";
import { createAdapter, getAvailableAdapters } from "../../src/adapters/AdapterFactory";
import type { Observation } from "~types/orchestration";
import type { ActionResult } from "~types/common";
import type { BrowserAction } from "~types/browser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockObservation(url: string): Observation {
  return {
    domState: {
      url,
      title: "Test Page",
      visibleElements: [],
      forms: [],
      canvasElements: [],
      iframes: [],
      timestamp: new Date().toISOString(),
    },
    task: {
      id: "task-1",
      name: "Edit text",
      type: "edit_text",
      goal: "Change heading to Hello",
      requiresVision: false,
      dependencies: [],
      status: "running",
      attempts: 1,
    },
    adapterKnowledge: { selectors: {} },
    previousActions: [],
    attempt: 1,
  };
}

function makeMockResult(): ActionResult {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    duration: 100,
  };
}

function makeMockAction(): BrowserAction {
  return { type: "click", target: { type: "css", selector: ".btn" } };
}

// ===========================================================================
// CanvaAdapter
// ===========================================================================

describe("CanvaAdapter", () => {
  let adapter: CanvaAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CanvaAdapter();
  });

  it("creates with correct name and supportedDomains", () => {
    expect(adapter.name).toBe("Canva");
    expect(adapter.supportedDomains).toEqual(["canva.com", "www.canva.com"]);
  });

  it("getKnowledge returns selectors, workflows, commonTasks, canvasRules, tips", () => {
    const knowledge = adapter.getKnowledge();
    expect(knowledge.selectors).toBeDefined();
    expect(Object.keys(knowledge.selectors).length).toBeGreaterThan(0);
    expect(knowledge.workflows).toBeDefined();
    expect(knowledge.commonTasks).toBeDefined();
    expect(knowledge.canvasRules).toBeDefined();
    expect(knowledge.tips).toBeDefined();
    expect(knowledge.tips!.length).toBeGreaterThan(0);
  });

  it("buildThinkPrompt includes URL, goal, task type from observation", () => {
    const obs = makeMockObservation("https://www.canva.com/design/123");
    obs.adapterKnowledge = adapter.getKnowledge();
    const prompt = adapter.buildThinkPrompt(obs);

    expect(prompt).toContain("https://www.canva.com/design/123");
    expect(prompt).toContain("Change heading to Hello");
    expect(prompt).toContain("edit_text");
  });

  it("buildVerifyPrompt includes task goal and result status", () => {
    const task = makeMockObservation("https://www.canva.com").task;
    const result = makeMockResult();
    const prompt = adapter.buildVerifyPrompt(task, result);

    expect(prompt).toContain("Change heading to Hello");
    expect(prompt).toContain("success");
  });

  it("executeCustomAction returns success ActionResult", async () => {
    const result = await adapter.executeCustomAction(makeMockAction());
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeDefined();
    expect(typeof result.duration).toBe("number");
  });
});

// ===========================================================================
// FigmaAdapter
// ===========================================================================

describe("FigmaAdapter", () => {
  let adapter: FigmaAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FigmaAdapter();
  });

  it("creates with correct name and supportedDomains", () => {
    expect(adapter.name).toBe("Figma");
    expect(adapter.supportedDomains).toEqual(["figma.com", "www.figma.com"]);
  });

  it("getKnowledge returns selectors, workflows, commonTasks", () => {
    const knowledge = adapter.getKnowledge();
    expect(knowledge.selectors).toBeDefined();
    expect(knowledge.workflows).toBeDefined();
    expect(knowledge.commonTasks).toBeDefined();
  });

  it("buildThinkPrompt includes Figma-specific content", () => {
    const obs = makeMockObservation("https://www.figma.com/file/123");
    obs.adapterKnowledge = adapter.getKnowledge();
    const prompt = adapter.buildThinkPrompt(obs);

    expect(prompt).toContain("Figma");
    expect(prompt).toContain("https://www.figma.com/file/123");
    expect(prompt).toContain("Change heading to Hello");
  });

  it("executeCustomAction returns success ActionResult", async () => {
    const result = await adapter.executeCustomAction(makeMockAction());
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeDefined();
  });
});

// ===========================================================================
// GenericWebAdapter
// ===========================================================================

describe("GenericWebAdapter", () => {
  let adapter: GenericWebAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GenericWebAdapter();
  });

  it("creates with correct name and supportedDomains", () => {
    expect(adapter.name).toBe("Generic Web");
    expect(adapter.supportedDomains).toEqual(["*"]);
  });

  it("getKnowledge returns generic selectors (button, input, link, image, canvas)", () => {
    const knowledge = adapter.getKnowledge();
    expect(knowledge.selectors.button).toBeDefined();
    expect(knowledge.selectors.input).toBeDefined();
    expect(knowledge.selectors.link).toBeDefined();
    expect(knowledge.selectors.image).toBeDefined();
    expect(knowledge.selectors.canvas).toBeDefined();
  });

  it("buildThinkPrompt mentions DOM structure and visual detection", () => {
    const obs = makeMockObservation("https://example.com");
    const prompt = adapter.buildThinkPrompt(obs);

    expect(prompt).toContain("DOM");
    expect(prompt).toContain("visual detection");
  });
});

// ===========================================================================
// AdapterRegistry
// ===========================================================================

describe("AdapterRegistry", () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new AdapterRegistry();
  });

  it("constructor creates with default adapters", () => {
    const adapters = registry.getAllAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
  });

  it("getAdapter returns CanvaAdapter for canva.com URL", () => {
    const adapter = registry.getAdapter("https://www.canva.com/design/123");
    expect(adapter.name).toBe("Canva");
  });

  it("getAdapter returns FigmaAdapter for figma.com URL", () => {
    const adapter = registry.getAdapter("https://www.figma.com/file/123");
    expect(adapter.name).toBe("Figma");
  });

  it("getAdapter returns GenericWebAdapter for unknown URL", () => {
    const adapter = registry.getAdapter("https://example.com");
    expect(adapter.name).toBe("Generic Web");
  });

  it("hasAdapterFor returns true for canva.com", () => {
    expect(registry.hasAdapterFor("https://www.canva.com")).toBe(true);
  });

  it("hasAdapterFor returns false for random.com", () => {
    expect(registry.hasAdapterFor("https://random.com")).toBe(false);
  });

  it("registerAdapter adds new adapter", () => {
    const before = registry.getAllAdapters().length;
    registry.registerAdapter(new GenericWebAdapter());
    expect(registry.getAllAdapters().length).toBe(before + 1);
  });

  it("getAllAdapters returns registered adapters", () => {
    const adapters = registry.getAllAdapters();
    expect(Array.isArray(adapters)).toBe(true);
    expect(adapters.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// AdapterFactory
// ===========================================================================

describe("AdapterFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createAdapter('canva') returns CanvaAdapter", () => {
    const adapter = createAdapter("canva");
    expect(adapter.name).toBe("Canva");
  });

  it("createAdapter('figma') returns FigmaAdapter", () => {
    const adapter = createAdapter("figma");
    expect(adapter.name).toBe("Figma");
  });

  it("createAdapter('generic') returns GenericWebAdapter", () => {
    const adapter = createAdapter("generic");
    expect(adapter.name).toBe("Generic Web");
  });

  it("createAdapter('unknown') throws", () => {
    expect(() => createAdapter("unknown")).toThrow("Unknown adapter");
  });

  it("getAvailableAdapters returns ['canva', 'figma', 'generic']", () => {
    expect(getAvailableAdapters()).toEqual(["canva", "figma", "generic"]);
  });
});
