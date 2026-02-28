/**
 * Execute complex action sequences with configurable retry logic.
 */

import type { ActionResult, RetryConfig } from "~types/common";
import type { BrowserAction } from "~types/browser";
import type { BrowserAgent } from "./BrowserAgent";

/** Error sub-strings that are safe to retry. */
const RETRYABLE_PATTERNS = ["not found", "timeout", "rate limit", "stale"];

/** Error sub-strings that should never be retried. */
const NON_RETRYABLE_PATTERNS = [
  "invalid selector",
  "permission denied",
  "cancelled",
];

/**
 * Orchestrates execution of one or more {@link BrowserAction}s through a
 * {@link BrowserAgent}, with optional retry and back-off behaviour.
 */
export class ActionExecutor {
  private readonly agent: BrowserAgent;
  private readonly defaultRetryConfig: RetryConfig;

  /**
   * @param agent - The BrowserAgent instance that will perform actions.
   * @param retryConfig - Default retry configuration for all actions.
   */
  constructor(agent: BrowserAgent, retryConfig?: RetryConfig) {
    this.agent = agent;
    this.defaultRetryConfig = retryConfig ?? {
      maxAttempts: 3,
      backoffMs: 500,
      strategy: "exponential",
    };
  }

  /**
   * Execute an ordered sequence of browser actions.
   *
   * @param actions - Actions to execute in order.
   * @param options - Optional configuration.
   * @param options.stopOnError - If `true`, stop at the first failure (default `true`).
   * @returns An array of results, one per action attempted.
   */
  async executeSequence(
    actions: BrowserAction[],
    options?: { stopOnError?: boolean },
  ): Promise<ActionResult[]> {
    const stopOnError = options?.stopOnError ?? true;
    const results: ActionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeWithRetry(action);
        results.push(result);

        if (!result.success && stopOnError) {
          console.info(
            "[ActionExecutor] Stopping sequence due to error:",
            result.error,
          );
          break;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        const failResult: ActionResult = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
          duration: 0,
        };
        results.push(failResult);

        if (stopOnError) {
          console.info(
            "[ActionExecutor] Stopping sequence due to exception:",
            message,
          );
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single action with retry logic according to the provided
   * (or default) {@link RetryConfig}.
   *
   * @param action - The browser action to execute.
   * @param retryConfig - Override retry config for this particular action.
   */
  async executeWithRetry(
    action: BrowserAction,
    retryConfig?: RetryConfig,
  ): Promise<ActionResult> {
    const config = retryConfig ?? this.defaultRetryConfig;
    let lastResult: ActionResult | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const start = Date.now();

      try {
        lastResult = await this.agent.executeAction(action);

        if (lastResult.success) {
          return lastResult;
        }

        // Check if the error is retryable
        if (lastResult.error && !this.isRetryableError(lastResult.error)) {
          console.debug(
            `[ActionExecutor] Non-retryable error on attempt ${attempt}:`,
            lastResult.error,
          );
          return lastResult;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        lastResult = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
        };

        if (!this.isRetryableError(message)) {
          return lastResult;
        }
      }

      // Wait before retrying (skip delay after last attempt)
      if (attempt < config.maxAttempts) {
        const delay = this.calculateBackoff(attempt, config);
        console.debug(
          `[ActionExecutor] Retrying action "${action.type}" in ${delay}ms (attempt ${attempt}/${config.maxAttempts})`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    return (
      lastResult ?? {
        success: false,
        error: "All retry attempts exhausted",
        timestamp: new Date().toISOString(),
        duration: 0,
      }
    );
  }

  /**
   * Determine whether an error message matches known retryable patterns.
   */
  private isRetryableError(error: string): boolean {
    const lower = error.toLowerCase();

    // Explicitly non-retryable errors take precedence
    if (NON_RETRYABLE_PATTERNS.some((p) => lower.includes(p))) {
      return false;
    }

    return RETRYABLE_PATTERNS.some((p) => lower.includes(p));
  }

  /**
   * Calculate the delay before the next retry attempt.
   *
   * @param attempt - The current attempt number (1-based).
   * @param config - The retry configuration.
   * @returns Delay in milliseconds.
   */
  private calculateBackoff(attempt: number, config: RetryConfig): number {
    switch (config.strategy) {
      case "immediate":
        return 0;

      case "linear":
        return config.backoffMs * attempt;

      case "exponential": {
        const base = config.backoffMs * Math.pow(2, attempt - 1);
        // Add ±25 % jitter to avoid thundering-herd
        const jitter = base * 0.25 * (Math.random() * 2 - 1);
        return Math.max(0, Math.round(base + jitter));
      }

      default:
        return config.backoffMs;
    }
  }
}
