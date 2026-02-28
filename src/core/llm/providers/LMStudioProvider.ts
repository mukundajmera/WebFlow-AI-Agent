/**
 * LMStudioProvider — LM Studio integration via OpenAI-compatible API.
 *
 * Connects to a locally running LM Studio server which exposes an
 * OpenAI-compatible REST API at http://localhost:1234/v1 by default.
 */

import type {
  GenerateOptions,
  LLMConfig,
  LLMMessage,
  LLMResponse,
} from "~types/llm";
import type { LLMProviderInterface } from "../ProviderFactory";

// ---------------------------------------------------------------------------
// Types for LM Studio (OpenAI-compatible) responses
// ---------------------------------------------------------------------------

interface LMStudioChatChoice {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string | null;
}

interface LMStudioChatResponse {
  id: string;
  model: string;
  choices: LMStudioChatChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface LMStudioModel {
  id: string;
}

interface LMStudioModelsResponse {
  data: LMStudioModel[];
}

interface LMStudioStreamDelta {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
  model: string;
}

// ---------------------------------------------------------------------------
// LMStudioProvider
// ---------------------------------------------------------------------------

/**
 * Provider for LM Studio's local inference server.
 *
 * LM Studio exposes an OpenAI-compatible API, so this provider mirrors
 * the OpenAI request/response format while targeting `localhost:1234`.
 */
export class LMStudioProvider implements LLMProviderInterface {
  private readonly baseURL: string;
  private readonly model: string;

  constructor(config: LLMConfig) {
    this.baseURL = (config.endpoint ?? "http://localhost:1234/v1").replace(/\/+$/, "");
    this.model = config.model ?? "local-model";
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Send a chat completion request to LM Studio.
   */
  async complete(
    messages: LLMMessage[],
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, options);
    const data = await this.post<LMStudioChatResponse>("/chat/completions", body);

    const choice = data.choices[0];
    return {
      content: choice?.message?.content ?? "",
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: this.mapFinishReason(choice?.finish_reason),
    };
  }

  /**
   * Stream a chat completion from LM Studio via SSE.
   */
  async completeStreaming(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LMStudioProvider: request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("LMStudioProvider: response body is not readable");
    }

    const decoder = new TextDecoder();
    let accumulated = "";
    let model = this.model;
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          const parsed = JSON.parse(payload) as LMStudioStreamDelta;
          model = parsed.model;
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            accumulated += content;
            onChunk(content);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { content: accumulated, model };
  }

  /**
   * Test whether the LM Studio server is reachable.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List models loaded in LM Studio.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/models`);
    if (!response.ok) {
      throw new Error(`LMStudioProvider: failed to list models (${response.status})`);
    }
    const data = (await response.json()) as LMStudioModelsResponse;
    return data.data.map((m) => m.id);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Build the request body for a chat completion call. */
  private buildRequestBody(
    messages: LLMMessage[],
    options?: GenerateOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.maxTokens) body.max_tokens = options.maxTokens;
    if (options?.topP !== undefined) body.top_p = options.topP;
    if (options?.stop) body.stop = options.stop;
    if (options?.stream) body.stream = true;
    if (options?.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    return body;
  }

  /** POST to a sub-path and return parsed JSON. */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`LMStudioProvider: request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  /** Map finish_reason to our typed union. */
  private mapFinishReason(
    reason: string | null | undefined,
  ): "stop" | "length" | "tool_calls" | undefined {
    if (reason === "stop") return "stop";
    if (reason === "length") return "length";
    if (reason === "tool_calls") return "tool_calls";
    return undefined;
  }
}
