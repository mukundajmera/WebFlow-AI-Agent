/**
 * VisionAgent — Main vision interface for analyzing screenshots via LLM.
 *
 * Wraps an LLM adapter that supports vision to provide high-level methods
 * for element detection, layout analysis, verification, and aesthetic scoring.
 */

import type { BoundingBox } from "~types/common";
import type {
  DetectedElement,
  ElementLocation,
  VerificationResult,
} from "~types/vision";
import type { BrowserAction } from "~types/browser";
import type { GenerateOptions, LLMResponse } from "~types/llm";

// ---------------------------------------------------------------------------
// LLM Adapter interface (not formally defined elsewhere yet)
// ---------------------------------------------------------------------------

/** Adapter that an LLM provider must satisfy to be used with VisionAgent. */
export interface LLMAdapter {
  supportsVision: boolean;
  generateWithVision(
    prompt: string,
    screenshot: string,
    options?: GenerateOptions,
  ): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Describes the spatial structure extracted from a screenshot. */
export interface LayoutStructure {
  hierarchy: string[];
  textBlocks: Array<{ content: string; bbox: BoundingBox; level: string }>;
  imagePlaceholders: Array<{ bbox: BoundingBox; type: string }>;
  gridStructure: { rows: number; columns: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_JSON_PARSE_RETRIES = 2;
const DEFAULT_CONFIDENCE_THRESHOLD = 50; // LLM returns 0-100

// ---------------------------------------------------------------------------
// VisionAgent
// ---------------------------------------------------------------------------

export class VisionAgent {
  private readonly llm: LLMAdapter;

  constructor(llm: LLMAdapter) {
    if (!llm.supportsVision) {
      throw new Error(
        "VisionAgent requires an LLM adapter that supports vision.",
      );
    }
    this.llm = llm;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Given a screenshot and a natural-language instruction, determine the next
   * browser action to take.
   */
  async analyzeAndDecide(
    screenshot: string,
    instruction: string,
  ): Promise<BrowserAction> {
    console.info("[VisionAgent] analyzeAndDecide – building prompt…");
    const prompt = this.buildVisionPrompt(
      "analyze_and_decide",
      `Instruction: ${instruction}\n\nAnalyze the screenshot and decide the next browser action. ` +
        `Return JSON: { "type": "<ActionType>", "target": { "type": "coordinates", "x": <number>, "y": <number> }, "value": <any>, "confidence": <0-100> }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    const parsed = await this.parseJsonResponse<BrowserAction & { confidence?: number }>(
      response.content,
    );
    this.validateConfidence(parsed.confidence);

    // Strip the non-standard confidence field before returning
    const { confidence: _conf, ...action } = parsed;
    console.debug("[VisionAgent] analyzeAndDecide – action:", action.type);
    return action as BrowserAction;
  }

  /**
   * Verify whether a task has been completed by examining a screenshot.
   */
  async verify(
    screenshot: string,
    verificationPrompt: string,
  ): Promise<VerificationResult> {
    console.info("[VisionAgent] verify – checking task completion…");
    const prompt = this.buildVisionPrompt(
      "verify",
      `${verificationPrompt}\n\nReturn JSON: { "success": <boolean>, "reasoning": "<string>", "confidence": <0-100>, "issues": ["<string>"] }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    const parsed = await this.parseJsonResponse<{
      success: boolean;
      reasoning: string;
      confidence: number;
      issues?: string[];
    }>(response.content);

    return {
      success: parsed.success,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence / 100, // normalize to 0-1
      issues: parsed.issues,
    };
  }

  /**
   * Locate an element in a screenshot given a natural-language description.
   */
  async locateElement(
    screenshot: string,
    description: string,
  ): Promise<ElementLocation> {
    console.info("[VisionAgent] locateElement –", description);
    const prompt = this.buildVisionPrompt(
      "locate_element",
      `Find the element described as: "${description}".\n\n` +
        `Return JSON: { "found": <boolean>, "bbox": { "x": <number>, "y": <number>, "width": <number>, "height": <number> }, "confidence": <0-100>, "selector": "<optional css>" }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    const parsed = await this.parseJsonResponse<{
      found: boolean;
      bbox?: BoundingBox;
      confidence: number;
      selector?: string;
    }>(response.content);

    return {
      found: parsed.found,
      bbox: parsed.bbox,
      confidence: parsed.confidence / 100,
      selector: parsed.selector,
    };
  }

  /**
   * Rate how well a template screenshot matches a style description (0-100).
   */
  async scoreTemplateMatch(
    templateScreenshot: string,
    styleDescription: string,
  ): Promise<number> {
    console.info("[VisionAgent] scoreTemplateMatch");
    const prompt = this.buildVisionPrompt(
      "score_template",
      `Rate how well this screenshot matches the style: "${styleDescription}".\n\n` +
        `Return JSON: { "score": <0-100>, "reasoning": "<string>" }`,
    );

    const response = await this.llm.generateWithVision(
      prompt,
      templateScreenshot,
      { responseFormat: "json" },
    );

    const parsed = await this.parseJsonResponse<{
      score: number;
      reasoning: string;
    }>(response.content);

    console.debug("[VisionAgent] scoreTemplateMatch – score:", parsed.score);
    return parsed.score;
  }

  /**
   * Detect all interactive elements in a screenshot.
   */
  async detectElements(screenshot: string): Promise<DetectedElement[]> {
    console.info("[VisionAgent] detectElements");
    const prompt = this.buildVisionPrompt(
      "detect_elements",
      `Detect all interactive UI elements.\n\n` +
        `Return JSON: { "elements": [{ "type": "<ElementType>", "bbox": { "x": <number>, "y": <number>, "width": <number>, "height": <number> }, "confidence": <0-100>, "label": "<string>" }] }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    const parsed = await this.parseJsonResponse<{
      elements: Array<DetectedElement & { confidence: number }>;
    }>(response.content);

    return parsed.elements.map((el) => ({
      ...el,
      confidence: el.confidence / 100, // normalize to 0-1
    }));
  }

  /**
   * Extract text (OCR) from a screenshot, optionally within a bounding box.
   */
  async extractText(
    screenshot: string,
    region?: BoundingBox,
  ): Promise<string> {
    console.info("[VisionAgent] extractText");
    const regionNote = region
      ? ` Focus on region: x=${region.x}, y=${region.y}, w=${region.width}, h=${region.height}.`
      : "";

    const prompt = this.buildVisionPrompt(
      "extract_text",
      `Extract all visible text from the screenshot.${regionNote}\n\nReturn JSON: { "text": "<extracted text>" }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    const parsed = await this.parseJsonResponse<{ text: string }>(
      response.content,
    );
    return parsed.text;
  }

  /**
   * Compare two screenshots and determine whether the described change occurred.
   */
  async compareScreenshots(
    before: string,
    after: string,
    changeDescription: string,
  ): Promise<boolean> {
    console.info("[VisionAgent] compareScreenshots");
    const prompt = this.buildVisionPrompt(
      "compare_screenshots",
      `Two screenshots are provided (before and after). ` +
        `Determine if the following change occurred: "${changeDescription}".\n\n` +
        `Return JSON: { "changed": <boolean>, "confidence": <0-100>, "reasoning": "<string>" }`,
    );

    // Send the "after" screenshot as the primary image; include "before" in the prompt context.
    const combinedPrompt = `${prompt}\n\n[BEFORE screenshot base64]: ${before}`;
    const response = await this.llm.generateWithVision(
      combinedPrompt,
      after,
      { responseFormat: "json" },
    );

    const parsed = await this.parseJsonResponse<{
      changed: boolean;
      confidence: number;
      reasoning: string;
    }>(response.content);

    console.debug(
      "[VisionAgent] compareScreenshots – changed:",
      parsed.changed,
    );
    return parsed.changed;
  }

  /**
   * Analyze the layout / design structure of a screenshot.
   */
  async analyzeLayout(screenshot: string): Promise<LayoutStructure> {
    console.info("[VisionAgent] analyzeLayout");
    const prompt = this.buildVisionPrompt(
      "analyze_layout",
      `Analyze the layout structure of this screenshot.\n\n` +
        `Return JSON: { "hierarchy": ["<string>"], "textBlocks": [{ "content": "<string>", "bbox": { "x": <n>, "y": <n>, "width": <n>, "height": <n> }, "level": "<string>" }], ` +
        `"imagePlaceholders": [{ "bbox": { "x": <n>, "y": <n>, "width": <n>, "height": <n> }, "type": "<string>" }], ` +
        `"gridStructure": { "rows": <number>, "columns": <number> } }`,
    );

    const response = await this.llm.generateWithVision(prompt, screenshot, {
      responseFormat: "json",
    });

    return this.parseJsonResponse<LayoutStructure>(response.content);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Build a structured prompt for a given vision task. */
  private buildVisionPrompt(task: string, details: string): string {
    return (
      `You are a vision-enabled AI assistant specialized in web UI analysis.\n` +
      `Task: ${task}\n\n${details}\n\n` +
      `IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences.`
    );
  }

  /**
   * Validate that the confidence value returned by the LLM exceeds the
   * minimum threshold. Throws when confidence is too low.
   */
  private validateConfidence(confidence: number | undefined): void {
    if (confidence === undefined) return;
    if (confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
      throw new Error(
        `Low confidence (${confidence}/100). Minimum required: ${DEFAULT_CONFIDENCE_THRESHOLD}.`,
      );
    }
  }

  /**
   * Parse a JSON string returned by the LLM. Retries with light cleanup
   * when the initial parse fails (e.g., markdown fences or trailing commas).
   */
  private async parseJsonResponse<T>(raw: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_JSON_PARSE_RETRIES; attempt++) {
      try {
        const cleaned = this.cleanJsonString(raw);
        return JSON.parse(cleaned) as T;
      } catch (err) {
        lastError = err;
        console.debug(
          `[VisionAgent] JSON parse attempt ${attempt + 1} failed, retrying…`,
        );
        // On subsequent attempts, apply increasingly aggressive cleanup
        raw = this.aggressiveClean(raw, attempt);
      }
    }

    throw new Error(
      `Failed to parse LLM JSON response after ${MAX_JSON_PARSE_RETRIES + 1} attempts: ${lastError}`,
    );
  }

  /** Basic cleanup: strip markdown fences and leading/trailing whitespace. */
  private cleanJsonString(raw: string): string {
    let cleaned = raw.trim();
    // Remove ```json ... ``` fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return cleaned.trim();
  }

  /** Progressively aggressive JSON cleanup depending on attempt number. */
  private aggressiveClean(raw: string, attempt: number): string {
    let cleaned = this.cleanJsonString(raw);

    if (attempt >= 1) {
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
      // Remove single-line comments
      cleaned = cleaned.replace(/\/\/.*$/gm, "");
    }

    if (attempt >= 2) {
      // Try to extract first JSON object from the string
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        cleaned = match[0];
      }
    }

    return cleaned;
  }
}
