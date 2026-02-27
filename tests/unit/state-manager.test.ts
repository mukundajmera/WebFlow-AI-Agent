import { describe, it, expect, vi, beforeEach } from "vitest";
import { StateManager } from "~background/core/StateManager";
import type { Job } from "~types/orchestration";
import type { UserConfig } from "~types/config";
import { DEFAULT_CONFIG } from "~types/config";
import type { LogEntry } from "~types/common";

/** Build a minimal valid Job for testing. */
function makeJob(overrides?: Partial<Job>): Job {
  return {
    id: overrides?.id ?? "job-1",
    prompt: "Test prompt",
    config: {
      llmProvider: { type: "groq" },
      templateMode: "same",
      exportFormat: "png",
    },
    tasks: [],
    status: "queued",
    progress: 0,
    currentTaskIndex: 0,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    results: [],
    errors: [],
    ...overrides,
  } as Job;
}

/**
 * Helper to configure the chrome.storage.local.get mock for specific keys.
 * Existing call to get returns data based on the provided map.
 */
function mockStorageGet(data: Record<string, unknown>) {
  vi.mocked(chrome.storage.local.get).mockImplementation(async (keys) => {
    if (typeof keys === "string") {
      return { [keys]: data[keys] };
    }
    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        if (k in data) result[k] = data[k];
      }
      return result;
    }
    return data;
  });
}

describe("StateManager", () => {
  let sm: StateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: storage returns empty objects
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);
    sm = new StateManager();
  });

  // ── saveJobState / getJobState ────────────────────────────────────

  describe("saveJobState and getJobState", () => {
    it("persists job to chrome.storage", async () => {
      const job = makeJob();
      mockStorageGet({ browserai_jobs_index: [] });

      await sm.saveJobState(job);

      expect(chrome.storage.local.set).toHaveBeenCalled();
      const setCalls = vi.mocked(chrome.storage.local.set).mock.calls;
      const jobSaveCall = setCalls.find(
        (c) => Object.keys(c[0]).some((k) => k.startsWith("browserai_jobs_job-1")),
      );
      expect(jobSaveCall).toBeDefined();
    });

    it("retrieves a job from storage", async () => {
      const job = makeJob({ id: "job-42" });
      mockStorageGet({ "browserai_jobs_job-42": job });

      const retrieved = await sm.getJobState("job-42");

      expect(retrieved).toEqual(job);
    });

    it("returns null for non-existent job", async () => {
      mockStorageGet({});

      const result = await sm.getJobState("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── getAllJobs ────────────────────────────────────────────────────

  describe("getAllJobs", () => {
    it("returns all jobs sorted by createdAt desc", async () => {
      const older = makeJob({ id: "old", createdAt: "2024-01-01T00:00:00Z" });
      const newer = makeJob({ id: "new", createdAt: "2024-06-01T00:00:00Z" });

      mockStorageGet({
        browserai_jobs_index: ["old", "new"],
        browserai_jobs_old: older,
        browserai_jobs_new: newer,
      });

      const jobs = await sm.getAllJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe("new");
      expect(jobs[1].id).toBe("old");
    });

    it("returns empty array when no jobs exist", async () => {
      mockStorageGet({ browserai_jobs_index: [] });

      const jobs = await sm.getAllJobs();
      expect(jobs).toEqual([]);
    });
  });

  // ── getActiveJob ──────────────────────────────────────────────────

  describe("getActiveJob", () => {
    it("returns null when no active job is set", async () => {
      mockStorageGet({});

      const active = await sm.getActiveJob();
      expect(active).toBeNull();
    });

    it("returns the active job when set", async () => {
      const job = makeJob({ id: "active-1" });
      mockStorageGet({
        browserai_active_job: "active-1",
        "browserai_jobs_active-1": job,
      });

      const active = await sm.getActiveJob();
      expect(active?.id).toBe("active-1");
    });
  });

  // ── pauseJob / resumeJob ──────────────────────────────────────────

  describe("pauseJob and resumeJob", () => {
    it("pauseJob changes job status to paused", async () => {
      const job = makeJob({ id: "p1", status: "running" });
      mockStorageGet({
        "browserai_jobs_p1": job,
        browserai_jobs_index: ["p1"],
      });

      await sm.pauseJob("p1");

      const savedCall = vi.mocked(chrome.storage.local.set).mock.calls.find(
        (c) => {
          const val = Object.values(c[0])[0] as any;
          return val?.id === "p1" && val?.status === "paused";
        },
      );
      expect(savedCall).toBeDefined();
    });

    it("resumeJob changes job status to running", async () => {
      const job = makeJob({ id: "r1", status: "paused" });
      mockStorageGet({
        "browserai_jobs_r1": job,
        browserai_jobs_index: ["r1"],
      });

      await sm.resumeJob("r1");

      const savedCall = vi.mocked(chrome.storage.local.set).mock.calls.find(
        (c) => {
          const val = Object.values(c[0])[0] as any;
          return val?.id === "r1" && val?.status === "running";
        },
      );
      expect(savedCall).toBeDefined();
    });

    it("pauseJob throws for non-existent job", async () => {
      mockStorageGet({});
      await expect(sm.pauseJob("missing")).rejects.toThrow("Job missing not found");
    });
  });

  // ── saveConfig / getConfig ────────────────────────────────────────

  describe("saveConfig and getConfig", () => {
    it("persists and retrieves config", async () => {
      const config: UserConfig = { ...DEFAULT_CONFIG };
      await sm.saveConfig(config);

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("returns DEFAULT_CONFIG when none stored", async () => {
      mockStorageGet({});

      const config = await sm.getConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("rejects invalid config missing required sections", async () => {
      await expect(sm.saveConfig({} as any)).rejects.toThrow(
        "Invalid configuration: missing required sections",
      );
    });
  });

  // ── saveLogs / getLogs / clearLogs ────────────────────────────────

  describe("logging", () => {
    const entry: LogEntry = {
      level: "info",
      message: "Test log",
      timestamp: new Date().toISOString(),
    };

    it("saveLogs appends log entries", async () => {
      mockStorageGet({ browserai_logs: [] });

      await sm.saveLogs([entry]);

      const setCall = vi.mocked(chrome.storage.local.set).mock.calls.find(
        (c) => "browserai_logs" in c[0],
      );
      expect(setCall).toBeDefined();
      const savedLogs = (setCall![0] as Record<string, unknown>).browserai_logs as LogEntry[];
      expect(savedLogs).toHaveLength(1);
      expect(savedLogs[0].message).toBe("Test log");
    });

    it("getLogs returns stored logs", async () => {
      mockStorageGet({ browserai_logs: [entry] });

      const logs = await sm.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe("Test log");
    });

    it("clearLogs removes all logs", async () => {
      await sm.clearLogs();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith("browserai_logs");
    });
  });

  // ── encryptApiKey / decryptApiKey ─────────────────────────────────

  describe("encryption", () => {
    it("round-trips an API key", () => {
      const original = "sk-test-key-12345";
      const encrypted = sm.encryptApiKey(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.startsWith("enc:")).toBe(true);

      const decrypted = sm.decryptApiKey(encrypted);
      expect(decrypted).toBe(original);
    });

    it("returns empty string unchanged", () => {
      expect(sm.encryptApiKey("")).toBe("");
      expect(sm.decryptApiKey("")).toBe("");
    });

    it("does not double-encrypt", () => {
      const encrypted = sm.encryptApiKey("mykey");
      const doubleEncrypted = sm.encryptApiKey(encrypted);
      expect(doubleEncrypted).toBe(encrypted);
    });

    it("returns non-encrypted string as-is from decrypt", () => {
      expect(sm.decryptApiKey("plain-text")).toBe("plain-text");
    });
  });
});
