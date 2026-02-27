import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionExecutor } from "~core/browser/ActionExecutor";
import type { BrowserAction } from "~types/browser";
import type { ActionResult } from "~types/common";

function okResult(): ActionResult {
  return { success: true, timestamp: new Date().toISOString(), duration: 10 };
}

function failResult(error: string): ActionResult {
  return { success: false, error, timestamp: new Date().toISOString(), duration: 10 };
}

describe("ActionExecutor", () => {
  let mockAgent: any;
  let executor: ActionExecutor;

  const clickAction: BrowserAction = {
    type: "click",
    target: { type: "css", selector: "#btn" },
  };

  const typeAction: BrowserAction = {
    type: "type",
    target: { type: "css", selector: "#input" },
    value: "hello",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent = {
      executeAction: vi.fn(),
    };
    executor = new ActionExecutor(mockAgent, {
      maxAttempts: 3,
      backoffMs: 10,
      strategy: "immediate",
    });
  });

  // ── executeSequence ──────────────────────────────────────────────

  describe("executeSequence", () => {
    it("runs actions in order and returns all results", async () => {
      mockAgent.executeAction.mockResolvedValue(okResult());

      const results = await executor.executeSequence([clickAction, typeAction]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(2);
    });

    it("stops on error when stopOnError is true (default)", async () => {
      // Use a non-retryable error so executeWithRetry returns immediately
      mockAgent.executeAction
        .mockResolvedValueOnce(failResult("invalid selector"))
        .mockResolvedValueOnce(okResult());

      const results = await executor.executeSequence([clickAction, typeAction]);

      // First action fails (non-retryable), sequence stops, second never runs
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("continues on error when stopOnError is false", async () => {
      mockAgent.executeAction
        .mockResolvedValueOnce(failResult("invalid selector"))
        .mockResolvedValueOnce(okResult());

      const results = await executor.executeSequence(
        [clickAction, typeAction],
        { stopOnError: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it("handles thrown exceptions as failures", async () => {
      mockAgent.executeAction
        .mockRejectedValueOnce(new Error("permission denied"))
        .mockResolvedValueOnce(okResult());

      const results = await executor.executeSequence(
        [clickAction, typeAction],
        { stopOnError: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("permission denied");
      expect(results[1].success).toBe(true);
    });
  });

  // ── executeWithRetry ─────────────────────────────────────────────

  describe("executeWithRetry", () => {
    it("returns on first success without retrying", async () => {
      mockAgent.executeAction.mockResolvedValue(okResult());

      const result = await executor.executeWithRetry(clickAction);

      expect(result.success).toBe(true);
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable errors and eventually succeeds", async () => {
      mockAgent.executeAction
        .mockResolvedValueOnce(failResult("element not found"))
        .mockResolvedValueOnce(failResult("timeout"))
        .mockResolvedValueOnce(okResult());

      const result = await executor.executeWithRetry(clickAction);

      expect(result.success).toBe(true);
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(3);
    });

    it("does not retry on non-retryable errors", async () => {
      mockAgent.executeAction.mockResolvedValue(failResult("invalid selector"));

      const result = await executor.executeWithRetry(clickAction);

      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid selector");
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(1);
    });

    it("does not retry on non-retryable thrown exceptions", async () => {
      mockAgent.executeAction.mockRejectedValue(new Error("permission denied"));

      const result = await executor.executeWithRetry(clickAction);

      expect(result.success).toBe(false);
      expect(result.error).toBe("permission denied");
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(1);
    });

    it("exhausts all retries when error is retryable", async () => {
      mockAgent.executeAction.mockResolvedValue(failResult("timeout"));

      const result = await executor.executeWithRetry(clickAction, {
        maxAttempts: 2,
        backoffMs: 1,
        strategy: "immediate",
      });

      expect(result.success).toBe(false);
      expect(mockAgent.executeAction).toHaveBeenCalledTimes(2);
    });
  });
});
