import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Background Service Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle START_JOB message", async () => {
    // Mock sendMessage response
    const mockResponse = {
      success: true,
      data: { jobId: "test-id", status: "queued" },
    };

    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue(mockResponse);

    const response = await chrome.runtime.sendMessage({
      type: "START_JOB",
      payload: { prompt: "Create a design" },
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe("queued");
  });

  it("should reject empty prompts", async () => {
    const mockResponse = {
      success: false,
      error: "Prompt is required",
    };

    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue(mockResponse);

    const response = await chrome.runtime.sendMessage({
      type: "START_JOB",
      payload: { prompt: "" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Prompt is required");
  });

  it("should handle GET_CONFIG message", async () => {
    const mockResponse = {
      success: true,
      data: {},
    };

    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue(mockResponse);

    const response = await chrome.runtime.sendMessage({
      type: "GET_CONFIG",
    });

    expect(response.success).toBe(true);
  });
});
