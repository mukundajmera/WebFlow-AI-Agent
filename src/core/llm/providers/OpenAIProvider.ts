/**
 * OpenAIProvider — OpenAI-compatible API integration.
 *
 * Handles communication with OpenAI (and compatible APIs like Groq, DeepSeek)
 * for chat completions, streaming, and vision capabilities.
 */

import type {
  GenerateOptions,
  LLMConfig,
  LLMMessage,
  LLMResponse,
} from "~types/llm";
import type { LLMProviderInterface } from "../ProviderFactory";

// ---------------------------------------------------------------------------
// Types for OpenAI API responses
// ---------------------------------------------------------------------------

interface OpenAIChatChoice {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string | null;
}

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface OpenAIModel {
  id: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
}

interface OpenAIStreamDelta {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------

/**
 * Provider for the OpenAI chat completions API.
 *
 * Also works with OpenAI-compatible endpoints (Groq, DeepSeek, etc.)
 * by overriding `baseURL` via `LLMConfig.endpoint`.
 */
export class OpenAIProvider implements LLMProviderInterface {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error("OpenAIProvider requires an API key in config.apiKey");
    }
    this.apiKey = config.apiKey;
    this.baseURL = (config.endpoint ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.model = config.model ?? "gpt-4-turbo-preview";
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Send a chat completion request and return a structured response.
   */
  async complete(
    messages: LLMMessage[],
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, options);
    const data = await this.post<OpenAIChatResponse>("/chat/completions", body);

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
   * Stream a chat completion, invoking `onChunk` for each content delta.
   */
  async completeStreaming(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    this.assertResponse(response);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("OpenAIProvider: response body is not readable");
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

          const parsed = JSON.parse(payload) as OpenAIStreamDelta;
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
   * Send a vision-enabled chat completion with image content.
   */
  async completeWithVision(
    messages: LLMMessage[],
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const visionMessages = messages.map((msg) => {
      if (msg.imageUrl) {
        return {
          role: msg.role,
          content: [
            { type: "text" as const, text: msg.content },
            {
              type: "image_url" as const,
              image_url: { url: msg.imageUrl },
            },
          ],
        };
      }
      return { role: msg.role, content: msg.content };
    });

    const body = {
      model: this.model,
      messages: visionMessages,
      ...(options?.maxTokens && { max_tokens: options.maxTokens }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
    };

    const data = await this.post<OpenAIChatResponse>("/chat/completions", body);

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
   * Test whether the provider is reachable and the API key is valid.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.headers(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve the list of available models from the provider.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: this.headers(),
    });
    this.assertResponse(response);
    const data = (await response.json()) as OpenAIModelsResponse;
    return data.data.map((m) => m.id);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Standard headers including the Bearer token. */
  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /** POST to a sub-path and return parsed JSON. */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    this.assertResponse(response);
    return (await response.json()) as T;
  }

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
    if (options?.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty;
    if (options?.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty;
    if (options?.stop) body.stop = options.stop;
    if (options?.stream) body.stream = true;
    if (options?.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    return body;
  }

  /** Assert the fetch response is OK, throwing a descriptive error otherwise. */
  private assertResponse(response: Response): void {
    if (response.ok) return;

    if (response.status === 401) {
      throw new Error("OpenAIProvider: unauthorized – check your API key (401)");
    }
    if (response.status === 429) {
      throw new Error("OpenAIProvider: rate limit exceeded – try again later (429)");
    }
    if (response.status >= 500) {
      throw new Error(`OpenAIProvider: server error (${response.status})`);
    }

    throw new Error(`OpenAIProvider: request failed with status ${response.status}`);
  }

  /** Map the OpenAI finish_reason string to our typed union. */
  private mapFinishReason(
    reason: string | null | undefined,
  ): "stop" | "length" | "tool_calls" | undefined {
    if (reason === "stop") return "stop";
    if (reason === "length") return "length";
    if (reason === "tool_calls") return "tool_calls";
    return undefined;
  }
}
