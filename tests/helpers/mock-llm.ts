import { vi } from "vitest";
import type { LLMResponse, GenerateOptions, LLMMessage } from "~types";

/**
 * Mock LLM provider for testing
 */
export class MockLLMProvider {
  private responses: Map<string, LLMResponse> = new Map();

  /**
   * Set a mock response for a given prompt pattern
   */
  setResponse(pattern: string, response: LLMResponse): void {
    this.responses.set(pattern, response);
  }

  /**
   * Generate a response (returns mock)
   */
  async generate(messages: LLMMessage[], _options?: GenerateOptions): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || "";

    // Find matching response
    for (const [pattern, response] of this.responses) {
      if (content.includes(pattern)) {
        return response;
      }
    }

    // Default response
    return {
      content: '{"action": "default", "message": "Mock response"}',
      model: "mock-model",
      usage: {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
      },
      finishReason: "stop",
    };
  }

  /**
   * Generate with vision (returns mock)
   */
  async generateWithVision(
    messages: LLMMessage[],
    _image: string
  ): Promise<LLMResponse> {
    return this.generate(messages);
  }

  /**
   * Reset all mock responses
   */
  reset(): void {
    this.responses.clear();
  }
}

/**
 * Create a mock LLM provider
 */
export function createMockLLMProvider(): MockLLMProvider {
  return new MockLLMProvider();
}

/**
 * Mock fetch for LLM API calls
 */
export function mockLLMFetch(response: Partial<LLMResponse>): void {
  const fullResponse: LLMResponse = {
    content: response.content || "",
    model: response.model || "mock-model",
    usage: response.usage || {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    finishReason: response.finishReason || "stop",
  };

  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: { content: fullResponse.content },
          finish_reason: fullResponse.finishReason,
        },
      ],
      model: fullResponse.model,
      usage: {
        prompt_tokens: fullResponse.usage?.promptTokens,
        completion_tokens: fullResponse.usage?.completionTokens,
        total_tokens: fullResponse.usage?.totalTokens,
      },
    }),
    text: async () => "",
  } as Response);
}
