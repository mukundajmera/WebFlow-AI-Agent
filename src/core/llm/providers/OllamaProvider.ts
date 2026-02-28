/**
 * OllamaProvider — Ollama integration via its native REST API.
 *
 * Connects to a locally running Ollama server which exposes its
 * API at http://localhost:11434 by default.
 */

import type {
  GenerateOptions,
  LLMConfig,
  LLMMessage,
  LLMResponse,
} from "~types/llm";
import type { LLMProviderInterface } from "../ProviderFactory";

// ---------------------------------------------------------------------------
// Types for Ollama API responses
// ---------------------------------------------------------------------------

interface OllamaChatMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaModel {
  name: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

// ---------------------------------------------------------------------------
// OllamaProvider
// ---------------------------------------------------------------------------

/**
 * Provider for the Ollama local inference server.
 *
 * Uses the Ollama-native `/api/chat`, `/api/tags`, and `/api/embeddings`
 * endpoints rather than the OpenAI-compatible layer.
 */
export class OllamaProvider implements LLMProviderInterface {
  private readonly baseURL: string;
  private readonly model: string;

  constructor(config: LLMConfig) {
    this.baseURL = (config.endpoint ?? "http://localhost:11434").replace(/\/+$/, "");
    this.model = config.model ?? "llama2";
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Send a chat completion request to Ollama (non-streaming).
   */
  async complete(
    messages: LLMMessage[],
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, options, false);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OllamaProvider: request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    return {
      content: data.message?.content ?? "",
      model: data.model,
      usage:
        data.prompt_eval_count !== undefined && data.eval_count !== undefined
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count,
              totalTokens: data.prompt_eval_count + data.eval_count,
            }
          : undefined,
      finishReason: data.done ? "stop" : undefined,
    };
  }

  /**
   * Stream a chat completion from Ollama via JSONL (newline-delimited JSON).
   */
  async completeStreaming(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: GenerateOptions,
  ): Promise<LLMResponse> {
    const body = this.buildRequestBody(messages, options, true);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OllamaProvider: streaming request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("OllamaProvider: response body is not readable");
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
          if (!trimmed) continue;

          const parsed = JSON.parse(trimmed) as OllamaChatResponse;
          model = parsed.model;
          const content = parsed.message?.content;
          if (content) {
            accumulated += content;
            onChunk(content);
          }
        }
      }

      // Parse any remaining data left in the buffer after the stream ends
      const remaining = buffer.trim();
      if (remaining) {
        const parsed = JSON.parse(remaining) as OllamaChatResponse;
        model = parsed.model;
        const content = parsed.message?.content;
        if (content) {
          accumulated += content;
          onChunk(content);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { content: accumulated, model };
  }

  /**
   * Test whether the Ollama server is reachable.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List models available on the Ollama server.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/api/tags`);
    if (!response.ok) {
      throw new Error(`OllamaProvider: failed to list models (${response.status})`);
    }
    const data = (await response.json()) as OllamaTagsResponse;
    return data.models.map((m) => m.name);
  }

  /**
   * Generate an embedding vector for the given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`OllamaProvider: embedding request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;
    return data.embedding;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Build the request body for Ollama's /api/chat endpoint. */
  private buildRequestBody(
    messages: LLMMessage[],
    options: GenerateOptions | undefined,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream,
    };

    const ollamaOptions: Record<string, unknown> = {};
    if (options?.temperature !== undefined) ollamaOptions.temperature = options.temperature;
    if (options?.maxTokens) ollamaOptions.num_predict = options.maxTokens;
    if (options?.topP !== undefined) ollamaOptions.top_p = options.topP;
    if (options?.frequencyPenalty !== undefined) ollamaOptions.frequency_penalty = options.frequencyPenalty;
    if (options?.presencePenalty !== undefined) ollamaOptions.presence_penalty = options.presencePenalty;
    if (options?.stop) ollamaOptions.stop = options.stop;

    if (Object.keys(ollamaOptions).length > 0) {
      body.options = ollamaOptions;
    }

    if (options?.responseFormat === "json") {
      body.format = "json";
    }

    return body;
  }
}
