import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisionAgent, type LLMAdapter } from "~core/vision/VisionAgent";
import type { LLMResponse } from "~types/llm";

function mockResponse(content: string): LLMResponse {
  return {
    content,
    model: "mock-model",
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: "stop",
  };
}

describe("VisionAgent", () => {
  let mockLLM: LLMAdapter;
  let agent: VisionAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLM = {
      supportsVision: true,
      generateWithVision: vi.fn(),
    };
    agent = new VisionAgent(mockLLM);
  });

  // ── Constructor ────────────────────────────────────────────────────

  it("throws if LLM adapter does not support vision", () => {
    expect(
      () => new VisionAgent({ supportsVision: false, generateWithVision: vi.fn() }),
    ).toThrow("VisionAgent requires an LLM adapter that supports vision.");
  });

  it("creates successfully when adapter supports vision", () => {
    expect(agent).toBeInstanceOf(VisionAgent);
  });

  // ── analyzeAndDecide ──────────────────────────────────────────────

  it("analyzeAndDecide returns a BrowserAction when confidence > 50", async () => {
    const json = JSON.stringify({
      type: "click",
      target: { type: "coordinates", x: 100, y: 200 },
      value: null,
      confidence: 85,
    });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const action = await agent.analyzeAndDecide("base64img", "Click the button");

    expect(action.type).toBe("click");
    expect(action.target).toEqual({ type: "coordinates", x: 100, y: 200 });
    expect((action as any).confidence).toBeUndefined();
  });

  it("analyzeAndDecide throws on low confidence (< 50)", async () => {
    const json = JSON.stringify({
      type: "click",
      target: { type: "coordinates", x: 10, y: 20 },
      value: null,
      confidence: 30,
    });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    await expect(agent.analyzeAndDecide("base64img", "Click something")).rejects.toThrow(
      "Low confidence (30/100)",
    );
  });

  // ── verify ────────────────────────────────────────────────────────

  it("verify returns VerificationResult with normalized confidence", async () => {
    const json = JSON.stringify({
      success: true,
      reasoning: "Text is visible",
      confidence: 90,
      issues: [],
    });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const result = await agent.verify("base64img", "Check text is visible");

    expect(result.success).toBe(true);
    expect(result.reasoning).toBe("Text is visible");
    expect(result.confidence).toBe(0.9); // normalized 0-1
    expect(result.issues).toEqual([]);
  });

  // ── locateElement ─────────────────────────────────────────────────

  it("locateElement returns ElementLocation", async () => {
    const json = JSON.stringify({
      found: true,
      bbox: { x: 10, y: 20, width: 100, height: 50 },
      confidence: 80,
      selector: ".my-btn",
    });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const loc = await agent.locateElement("base64img", "blue button");

    expect(loc.found).toBe(true);
    expect(loc.bbox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    expect(loc.confidence).toBe(0.8);
    expect(loc.selector).toBe(".my-btn");
  });

  // ── scoreTemplateMatch ────────────────────────────────────────────

  it("scoreTemplateMatch returns a number 0-100", async () => {
    const json = JSON.stringify({ score: 72, reasoning: "Good match" });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const score = await agent.scoreTemplateMatch("base64img", "modern dark theme");

    expect(score).toBe(72);
    expect(typeof score).toBe("number");
  });

  // ── detectElements ────────────────────────────────────────────────

  it("detectElements returns array of DetectedElement with normalized confidence", async () => {
    const json = JSON.stringify({
      elements: [
        { type: "button", bbox: { x: 0, y: 0, width: 50, height: 30 }, confidence: 90, label: "Submit" },
        { type: "input", bbox: { x: 60, y: 0, width: 200, height: 30 }, confidence: 70, label: "Email" },
      ],
    });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const elements = await agent.detectElements("base64img");

    expect(elements).toHaveLength(2);
    expect(elements[0].type).toBe("button");
    expect(elements[0].confidence).toBe(0.9);
    expect(elements[1].confidence).toBe(0.7);
  });

  // ── extractText ───────────────────────────────────────────────────

  it("extractText returns extracted text", async () => {
    const json = JSON.stringify({ text: "Hello World" });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const text = await agent.extractText("base64img");
    expect(text).toBe("Hello World");
  });

  it("extractText passes region info when provided", async () => {
    const json = JSON.stringify({ text: "Region text" });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const text = await agent.extractText("base64img", { x: 10, y: 20, width: 100, height: 50 });

    expect(text).toBe("Region text");
    expect(mockLLM.generateWithVision).toHaveBeenCalledTimes(1);
    const prompt = vi.mocked(mockLLM.generateWithVision).mock.calls[0][0];
    expect(prompt).toContain("x=10");
  });

  // ── compareScreenshots ────────────────────────────────────────────

  it("compareScreenshots returns boolean", async () => {
    const json = JSON.stringify({ changed: true, confidence: 95, reasoning: "Color changed" });
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(json));

    const changed = await agent.compareScreenshots("before", "after", "color changed");
    expect(changed).toBe(true);
  });

  // ── analyzeLayout ─────────────────────────────────────────────────

  it("analyzeLayout returns LayoutStructure", async () => {
    const layout = {
      hierarchy: ["header", "main", "footer"],
      textBlocks: [{ content: "Title", bbox: { x: 0, y: 0, width: 100, height: 20 }, level: "h1" }],
      imagePlaceholders: [{ bbox: { x: 0, y: 50, width: 100, height: 100 }, type: "hero" }],
      gridStructure: { rows: 3, columns: 2 },
    };
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(JSON.stringify(layout)));

    const result = await agent.analyzeLayout("base64img");

    expect(result.hierarchy).toEqual(["header", "main", "footer"]);
    expect(result.textBlocks).toHaveLength(1);
    expect(result.gridStructure).toEqual({ rows: 3, columns: 2 });
  });

  // ── Malformed JSON handling ───────────────────────────────────────

  it("handles JSON wrapped in markdown fences", async () => {
    const raw = '```json\n{"text": "parsed ok"}\n```';
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(raw));

    const text = await agent.extractText("base64img");
    expect(text).toBe("parsed ok");
  });

  it("handles JSON with trailing commas", async () => {
    const raw = '{"text": "fixed",}';
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(mockResponse(raw));

    const text = await agent.extractText("base64img");
    expect(text).toBe("fixed");
  });

  it("throws after exhausting retries on completely invalid JSON", async () => {
    vi.mocked(mockLLM.generateWithVision).mockResolvedValue(
      mockResponse("This is not JSON at all!!!"),
    );

    await expect(agent.extractText("base64img")).rejects.toThrow(
      "Failed to parse LLM JSON response",
    );
  });
});
