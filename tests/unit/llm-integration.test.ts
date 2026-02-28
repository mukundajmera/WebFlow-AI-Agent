import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptBuilder } from "~core/llm/PromptBuilder";
import { createProvider } from "~core/llm/ProviderFactory";
import { LLMAdapter } from "~core/llm/LLMAdapter";
import { LMStudioProvider } from "~core/llm/providers/LMStudioProvider";
import { OllamaProvider } from "~core/llm/providers/OllamaProvider";
import { OpenAIProvider } from "~core/llm/providers/OpenAIProvider";
import type { LLMConfig } from "~types/llm";

// ===========================================================================
// PromptBuilder
// ===========================================================================

describe("PromptBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buildSystemPrompt returns role-based prompt", () => {
    const prompt = PromptBuilder.buildSystemPrompt("web designer");
    expect(prompt).toContain("web designer");
    expect(prompt).toContain("expert");
  });

  it("buildSystemPrompt with context includes context", () => {
    const prompt = PromptBuilder.buildSystemPrompt("web designer", "Working on Canva");
    expect(prompt).toContain("web designer");
    expect(prompt).toContain("Working on Canva");
    expect(prompt).toContain("Context");
  });

  it("buildFewShotPrompt includes examples", () => {
    const prompt = PromptBuilder.buildFewShotPrompt("Translate text", [
      { input: "Hello", output: "Hola" },
      { input: "World", output: "Mundo" },
    ]);
    expect(prompt).toContain("Translate text");
    expect(prompt).toContain("Hello");
    expect(prompt).toContain("Hola");
    expect(prompt).toContain("Example 1");
    expect(prompt).toContain("Example 2");
  });

  it("buildChainOfThoughtPrompt includes step-by-step", () => {
    const prompt = PromptBuilder.buildChainOfThoughtPrompt("What is 2+2?");
    expect(prompt).toContain("What is 2+2?");
    expect(prompt).toContain("step by step");
  });

  it("formatJSONPrompt includes schema", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    const prompt = PromptBuilder.formatJSONPrompt(schema, "Generate a user");
    expect(prompt).toContain("Generate a user");
    expect(prompt).toContain('"type": "object"');
    expect(prompt).toContain("JSON");
  });
});

// ===========================================================================
// ProviderFactory
// ===========================================================================

describe("ProviderFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProvider with lmstudio config returns LMStudioProvider", () => {
    const config: LLMConfig = { type: "lmstudio" };
    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(LMStudioProvider);
  });

  it("createProvider with ollama config returns OllamaProvider", () => {
    const config: LLMConfig = { type: "ollama" };
    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("createProvider with groq config returns OpenAIProvider", () => {
    const config: LLMConfig = { type: "groq", apiKey: "test-key" };
    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("createProvider with deepseek config returns OpenAIProvider", () => {
    const config: LLMConfig = { type: "deepseek", apiKey: "test-key" };
    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("createProvider with webllm throws", () => {
    const config: LLMConfig = { type: "webllm" };
    expect(() => createProvider(config)).toThrow("WebLLM provider is not yet implemented");
  });
});

// ===========================================================================
// LLMAdapter
// ===========================================================================

describe("LLMAdapter", () => {
  let adapter: LLMAdapter;

  function mockFetchForOpenAI(content: string) {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: "chatcmpl-1",
        model: "test-model",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      text: vi.fn().mockResolvedValue(""),
    } as unknown as Response);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LLMAdapter({ type: "groq", apiKey: "test-key" });
  });

  it("generate calls fetch and returns LLMResponse", async () => {
    mockFetchForOpenAI("Hello from LLM");

    const response = await adapter.generate("Say hello");
    expect(response.content).toBe("Hello from LLM");
    expect(response.model).toBe("test-model");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("generateWithVision throws when supportsVision is false", async () => {
    const ollamaAdapter = new LLMAdapter({ type: "ollama" });
    await expect(ollamaAdapter.generateWithVision("prompt", "base64img")).rejects.toThrow(
      "does not support vision",
    );
  });

  it("parseJSON extracts JSON from plain string", () => {
    const result = adapter.parseJSON<{ name: string }>('{"name": "test"}');
    expect(result.name).toBe("test");
  });

  it("parseJSON extracts JSON from markdown fenced string", () => {
    const result = adapter.parseJSON<{ value: number }>('```json\n{"value": 42}\n```');
    expect(result.value).toBe(42);
  });

  it("parseJSON throws on invalid JSON", () => {
    expect(() => adapter.parseJSON("not json at all")).toThrow();
  });

  it("clearHistory empties history", async () => {
    mockFetchForOpenAI("response");
    await adapter.generate("msg");
    expect(adapter.getHistory().length).toBeGreaterThan(0);
    adapter.clearHistory();
    expect(adapter.getHistory()).toHaveLength(0);
  });

  it("getHistory returns copy of messages", async () => {
    mockFetchForOpenAI("response");
    await adapter.generate("msg");
    const history = adapter.getHistory();
    expect(history.length).toBe(2); // user + assistant
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
    // Verify it's a copy
    history.pop();
    expect(adapter.getHistory().length).toBe(2);
  });
});

// ===========================================================================
// LMStudioProvider
// ===========================================================================

describe("LMStudioProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructor uses defaults when no config provided", () => {
    const provider = new LMStudioProvider({ type: "lmstudio" });
    expect(provider).toBeInstanceOf(LMStudioProvider);
  });

  it("testConnection returns true when fetch succeeds", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Response);

    const provider = new LMStudioProvider({ type: "lmstudio" });
    const result = await provider.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection returns false when fetch throws", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Connection refused"));

    const provider = new LMStudioProvider({ type: "lmstudio" });
    const result = await provider.testConnection();
    expect(result).toBe(false);
  });

  it("complete returns LLMResponse", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: "chatcmpl-1",
        model: "local-model",
        choices: [{ index: 0, message: { role: "assistant", content: "Hi" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      }),
    } as unknown as Response);

    const provider = new LMStudioProvider({ type: "lmstudio" });
    const response = await provider.complete([{ role: "user", content: "Hello" }]);
    expect(response.content).toBe("Hi");
    expect(response.model).toBe("local-model");
  });
});

// ===========================================================================
// OllamaProvider
// ===========================================================================

describe("OllamaProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructor uses defaults", () => {
    const provider = new OllamaProvider({ type: "ollama" });
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("testConnection returns true when fetch succeeds", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ models: [] }),
    } as unknown as Response);

    const provider = new OllamaProvider({ type: "ollama" });
    const result = await provider.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection returns false when fetch throws", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Connection refused"));

    const provider = new OllamaProvider({ type: "ollama" });
    const result = await provider.testConnection();
    expect(result).toBe(false);
  });

  it("complete returns LLMResponse", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: "llama2",
        message: { role: "assistant", content: "Ollama says hi" },
        done: true,
        prompt_eval_count: 8,
        eval_count: 3,
      }),
    } as unknown as Response);

    const provider = new OllamaProvider({ type: "ollama" });
    const response = await provider.complete([{ role: "user", content: "Hello" }]);
    expect(response.content).toBe("Ollama says hi");
    expect(response.model).toBe("llama2");
    expect(response.usage?.totalTokens).toBe(11);
  });
});
