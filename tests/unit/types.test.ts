import { describe, it, expect } from "vitest";
import type { ActionResult, Job, JobStatus } from "~types";

describe("Common Types", () => {
  it("should create a valid ActionResult", () => {
    const result: ActionResult<string> = {
      success: true,
      data: "test",
      timestamp: new Date().toISOString(),
      duration: 100,
    };

    expect(result.success).toBe(true);
    expect(result.data).toBe("test");
    expect(result.duration).toBe(100);
  });

  it("should create an error ActionResult", () => {
    const result: ActionResult = {
      success: false,
      error: "Something went wrong",
      timestamp: new Date().toISOString(),
      duration: 50,
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe("Something went wrong");
  });
});

describe("Orchestration Types", () => {
  it("should allow valid job statuses", () => {
    const statuses: JobStatus[] = [
      "queued",
      "running",
      "paused",
      "completed",
      "failed",
      "cancelled",
    ];

    statuses.forEach((status) => {
      expect(typeof status).toBe("string");
    });
  });

  it("should create a minimal Job structure", () => {
    const job: Partial<Job> = {
      id: "test-id",
      prompt: "Create a design",
      status: "queued",
      progress: 0,
      tasks: [],
      results: [],
      errors: [],
    };

    expect(job.id).toBe("test-id");
    expect(job.status).toBe("queued");
    expect(job.tasks).toHaveLength(0);
  });
});
