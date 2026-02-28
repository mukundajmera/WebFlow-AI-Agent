/**
 * ProviderFactory — Factory for creating LLM provider instances.
 *
 * Provides a unified interface for all providers and utility functions
 * to detect which providers are currently available.
 */

import type {
  GenerateOptions,
  LLMConfig,
  LLMMessage,
  LLMResponse,
  ProviderStatus,
} from "~types/llm";
import { LMStudioProvider } from "./providers/LMStudioProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Common interface that all LLM providers must implement.
 */
export interface LLMProviderInterface {
  /** Send a chat completion request. */
  complete(messages: LLMMessage[], options?: GenerateOptions): Promise<LLMResponse>;
  /** Stream a chat completion, calling `onChunk` for each content fragment. */
  completeStreaming(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: GenerateOptions,
  ): Promise<LLMResponse>;
  /** Test whether the provider is reachable. */
  testConnection(): Promise<boolean>;
  /** List models available on the provider. */
  listModels(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an {@link LLMProviderInterface} from the given configuration.
 *
 * Maps the `LLMConfig.type` to the appropriate concrete provider class.
 * Providers that use an OpenAI-compatible API (`groq`, `deepseek`) are
 * handled by {@link OpenAIProvider} with the endpoint overridden.
 */
export function createProvider(config: LLMConfig): LLMProviderInterface {
  switch (config.type) {
    case "lmstudio":
      return new LMStudioProvider(config);

    case "ollama":
      return new OllamaProvider(config);

    case "groq":
      if (!config.apiKey) {
        throw new Error(
          "Groq provider requires an API key. Please set `apiKey` in your Groq configuration.",
        );
      }
      return new OpenAIProvider({
        ...config,
        endpoint: config.endpoint ?? "https://api.groq.com/openai/v1",
      });

    case "deepseek":
      if (!config.apiKey) {
        throw new Error(
          "DeepSeek provider requires an API key. Please set `apiKey` in your DeepSeek configuration.",
        );
      }
      return new OpenAIProvider({
        ...config,
        endpoint: config.endpoint ?? "https://api.deepseek.com/v1",
      });

    case "webllm":
      throw new Error(
        "WebLLM provider is not yet implemented. Use a local or cloud provider instead.",
      );

    default: {
      const exhaustive: never = config.type;
      throw new Error(`Unknown LLM provider type: ${String(exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

/**
 * Probe well-known local and cloud providers to determine availability.
 *
 * Tests LM Studio (localhost:1234), Ollama (localhost:11434), and an
 * optional OpenAI key. Returns a {@link ProviderStatus} for each.
 */
export async function detectAvailableProviders(): Promise<ProviderStatus[]> {
  const results: ProviderStatus[] = [];

  const probes: Array<{ type: "lmstudio" | "ollama"; config: LLMConfig }> = [
    { type: "lmstudio", config: { type: "lmstudio" } },
    { type: "ollama", config: { type: "ollama" } },
  ];

  const settled = await Promise.allSettled(
    probes.map(async ({ type, config }) => {
      const start = Date.now();
      const provider = createProvider(config);
      const available = await provider.testConnection();
      const latencyMs = Date.now() - start;
      return { provider: type, available, latencyMs } satisfies ProviderStatus;
    }),
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      results.push({ provider: probes[i].type, available: false, error: reason });
    }
  }

  return results;
}
