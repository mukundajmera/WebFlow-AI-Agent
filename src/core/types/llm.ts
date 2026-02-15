/**
 * LLM (Large Language Model) types for provider abstraction
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = "groq" | "deepseek" | "ollama" | "lmstudio" | "webllm";

/**
 * Configuration for an LLM provider
 */
export interface LLMConfig {
  type: LLMProvider;
  /** API key for cloud providers */
  apiKey?: string;
  /** Endpoint URL for local providers */
  endpoint?: string;
  /** Model name/ID */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Role types for conversation messages
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * A message in a conversation
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
  /** Tool name if role is 'tool' */
  name?: string;
  /** Image URL for vision models (base64 or URL) */
  imageUrl?: string;
}

/**
 * Response from an LLM
 */
export interface LLMResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: "stop" | "length" | "tool_calls";
  toolCalls?: ToolCall[];
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Definition of a tool that can be called by an LLM
 */
export interface Tool {
  name: string;
  description: string;
  /** JSON Schema for tool parameters */
  parameters: JSONSchema;
}

/**
 * A call to a tool made by the LLM
 */
export interface ToolCall {
  id?: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

/**
 * Result from executing a tool
 */
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError: boolean;
}

/**
 * JSON Schema type definition for tool parameters
 */
export interface JSONSchema {
  type: "object" | "string" | "number" | "boolean" | "array";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  items?: JSONSchema;
  enum?: unknown[];
  default?: unknown;
}

/**
 * Options for text generation
 */
export interface GenerateOptions {
  /** Temperature (0-2), default 0.7 */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** Enable streaming */
  stream?: boolean;
  /** Response format */
  responseFormat?: "text" | "json";
  /** Tools available for the LLM to call */
  tools?: Tool[];
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  provider: LLMProvider;
  available: boolean;
  latencyMs?: number;
  error?: string;
}
