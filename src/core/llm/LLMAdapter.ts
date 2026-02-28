/**
 * LLMAdapter — Unified adapter for interacting with LLM providers.
 *
 * Wraps an {@link LLMProviderInterface} to provide conversation history
 * management, retry logic, JSON extraction, streaming, and vision support.
 *
 * This class is compatible with the `LLMAdapter` interface defined in
 * {@link VisionAgent} (`supportsVision` + `generateWithVision`).
 */

import type {
  GenerateOptions,
  LLMConfig,
  LLMMessage,
  LLMResponse,
} from "~types/llm";
import { createProvider } from "./ProviderFactory";
import type { LLMProviderInterface } from "./ProviderFactory";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant specialized in web design automation.";
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Vision-capable providers
// ---------------------------------------------------------------------------

/** Provider types known to support vision / multimodal input. */
const VISION_PROVIDERS = new Set(["groq", "deepseek"]);

// ---------------------------------------------------------------------------
// LLMAdapter
// ---------------------------------------------------------------------------

/**
 * High-level adapter that manages conversation state, retries, streaming,
 * and JSON extraction on top of any {@link LLMProviderInterface}.
 */
export class LLMAdapter {
  /** Whether the underlying provider supports vision / multimodal input. */
  readonly supportsVision: boolean;

  private readonly provider: LLMProviderInterface;
  private readonly config: LLMConfig;
  private conversationHistory: LLMMessage[] = [];
  private systemPrompt: string = DEFAULT_SYSTEM_PROMPT;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = createProvider(config);
    this.supportsVision = VISION_PROVIDERS.has(config.type);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate a response from the LLM for the given prompt.
   *
   * Builds a message array from the system prompt, conversation history,
   * and the new user prompt, then calls the underlying provider.
   */
  async generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const messages = this.buildMessages(prompt);

    console.debug("[LLMAdapter] generate – sending", messages.length, "messages");
    const response = await this.provider.complete(messages, options);

    this.conversationHistory.push(
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    );

    return response;
  }

  /**
   * Generate a response for a vision/multimodal prompt.
   *
   * @throws If the underlying provider does not support vision.
   */
  async generateWithVision(
    prompt: string,
    screenshot: string,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    if (!this.supportsVision) {
      throw new Error(
        `LLMAdapter: provider "${this.config.type}" does not support vision`,
      );
    }

    const messages = this.buildMessages(prompt);
    // Attach the screenshot to the last (user) message.
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.imageUrl = screenshot;
    }

    console.debug("[LLMAdapter] generateWithVision – sending with image");

    // Prefer a vision-capable method if the provider implements it.
    const providerWithVision = this.provider as LLMProviderInterface & {
      completeWithVision?: (messages: LLMMessage[], options?: GenerateOptions) => Promise<LLMResponse>;
    };
    const response =
      typeof providerWithVision.completeWithVision === "function"
        ? await providerWithVision.completeWithVision(messages, options)
        : await this.provider.complete(messages, options);

    // Keep vision turns in the conversation history.
    this.conversationHistory.push(
      { role: "user", content: prompt, imageUrl: screenshot },
      { role: "assistant", content: response.content },
    );

    return response;
  }

  /**
   * Stream a response from the LLM, calling `onChunk` for each content
   * fragment as it arrives.
   */
  async generateStreaming(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const messages = this.buildMessages(prompt);

    console.debug("[LLMAdapter] generateStreaming – starting stream");
    const response = await this.provider.completeStreaming(
      messages,
      onChunk,
      options,
    );

    this.conversationHistory.push(
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    );

    return response;
  }

  /**
   * Generate a response with automatic retry and exponential back-off.
   */
  async generateWithRetry(
    prompt: string,
    maxAttempts: number = DEFAULT_MAX_RETRY_ATTEMPTS,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.generate(prompt, options);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.info(
          `[LLMAdapter] attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`,
        );
        if (attempt < maxAttempts) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error("LLMAdapter: all retry attempts exhausted");
  }

  /**
   * Extract and parse JSON from an LLM response string.
   *
   * Strips markdown code fences and attempts to locate the first
   * JSON object or array in the text.
   */
  parseJSON<T>(response: string): T {
    let cleaned = response.trim();
    // Remove markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    cleaned = cleaned.trim();

    // Try direct parse first
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Fall back: extract first complete JSON object or array using brace balancing
      const extracted = this.extractFirstJSON(cleaned);
      if (extracted) {
        return JSON.parse(extracted) as T;
      }
      throw new Error("LLMAdapter: could not extract JSON from response");
    }
  }

  /** Clear the conversation history. */
  clearHistory(): void {
    this.conversationHistory = [];
    console.debug("[LLMAdapter] conversation history cleared");
  }

  /** Return a copy of the current conversation history. */
  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /** Update the system prompt used for new conversations. */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Assemble the full message array for a provider call. */
  private buildMessages(userPrompt: string): LLMMessage[] {
    return [
      { role: "system", content: this.systemPrompt },
      ...this.conversationHistory,
      { role: "user", content: userPrompt },
    ];
  }

  /** Promise-based sleep helper for retry back-off. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extract the first complete JSON object or array from a string using
   * brace/bracket balancing to avoid the greedy-regex problem.
   */
  private extractFirstJSON(text: string): string | null {
    const startIdx = text.search(/[\[{]/);
    if (startIdx === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") depth--;

      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }

    return null;
  }
}
