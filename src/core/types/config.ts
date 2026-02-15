/**
 * Configuration types for user preferences and settings
 */

import type { LLMConfig, LLMProvider } from "./llm";

/**
 * Complete user configuration
 */
export interface UserConfig {
  llm: LLMPreferences;
  vision: VisionPreferences;
  browser: BrowserPreferences;
  defaults: DefaultSettings;
  privacy: PrivacySettings;
}

/**
 * LLM provider preferences
 */
export interface LLMPreferences {
  /** Default provider to use */
  defaultProvider: LLMProvider;
  /** Configuration for each provider */
  providers: Record<LLMProvider, LLMConfig>;
  /** Fallback chain when primary provider fails */
  fallbackChain: LLMProvider[];
}

/**
 * Vision model preferences
 */
export interface VisionPreferences {
  /** Prefer local vision models over cloud */
  preferLocal: boolean;
  /** Screenshot quality (0-100) */
  screenshotQuality: number;
  /** Maximum screenshot size in MB */
  maxScreenshotSize: number;
}

/**
 * Browser automation preferences
 */
export interface BrowserPreferences {
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Add delays for debugging */
  slowMode: boolean;
  /** Headless browser operation */
  headless: boolean;
}

/**
 * Default settings for new jobs
 */
export interface DefaultSettings {
  exportFormat: "png" | "pdf" | "jpg";
  templateMode: "same" | "copy" | "new";
  /** Enable parallel execution */
  parallel: boolean;
  /** Maximum concurrent tasks */
  maxConcurrent: number;
}

/**
 * Privacy-related settings
 */
export interface PrivacySettings {
  /** Allow sending screenshots to cloud vision */
  allowCloudVision: boolean;
  /** Allow anonymous usage telemetry */
  allowTelemetry: boolean;
  /** Store screenshots in local storage */
  storeScreenshots: boolean;
  /** Logging verbosity */
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: UserConfig = {
  llm: {
    defaultProvider: "groq",
    providers: {
      groq: { type: "groq", model: "llama-3.3-70b-versatile" },
      deepseek: { type: "deepseek", model: "deepseek-chat" },
      ollama: { type: "ollama", endpoint: "http://localhost:11434", model: "llama3.2" },
      lmstudio: { type: "lmstudio", endpoint: "http://localhost:1234" },
      webllm: { type: "webllm", model: "Llama-3.2-1B-Instruct" },
    },
    fallbackChain: ["groq", "ollama"],
  },
  vision: {
    preferLocal: true,
    screenshotQuality: 80,
    maxScreenshotSize: 2,
  },
  browser: {
    defaultTimeout: 30000,
    retryAttempts: 3,
    slowMode: false,
    headless: false,
  },
  defaults: {
    exportFormat: "png",
    templateMode: "same",
    parallel: false,
    maxConcurrent: 2,
  },
  privacy: {
    allowCloudVision: false,
    allowTelemetry: false,
    storeScreenshots: true,
    logLevel: "info",
  },
};
