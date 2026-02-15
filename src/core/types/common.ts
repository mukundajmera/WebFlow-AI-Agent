/**
 * Common types shared across the BrowserAI Craft framework
 */

/**
 * Represents X/Y coordinates
 */
export interface Coordinates {
  x: number;
  y: number;
}

/**
 * Represents a bounding box for element positioning
 */
export interface BoundingBox {
  /** Top-left X position (pixels or percentage) */
  x: number;
  /** Top-left Y position */
  y: number;
  /** Width of the box */
  width: number;
  /** Height of the box */
  height: number;
}

/**
 * Selector types for identifying elements on a page
 */
export type ElementSelector =
  | { type: "css"; selector: string }
  | { type: "coordinates"; x: number; y: number }
  | { type: "semantic"; description: string };

/**
 * Represents an element on the page with location information
 */
export interface Element {
  selector: ElementSelector;
  bbox?: BoundingBox;
  /** Confidence score for vision-detected elements (0-1) */
  confidence?: number;
}

/**
 * Generic result type for async operations
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  /** Initial backoff in milliseconds */
  backoffMs: number;
  strategy: "immediate" | "linear" | "exponential";
  /** Error patterns that should trigger a retry */
  retryableErrors?: string[];
}

/**
 * Utility type for deep partial objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utility type for non-empty arrays
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}
