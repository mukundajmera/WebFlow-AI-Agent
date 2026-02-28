/**
 * BrowserAI Craft Background Service Worker
 *
 * Main entry point for the extension's background logic. Coordinates:
 * - Service worker lifecycle (install / activate)
 * - System initialisation (StateManager, JobQueue, StorageMonitor)
 * - Message routing between side-panel, content scripts and core
 * - Job management (start, pause, resume, cancel, status)
 * - Configuration persistence
 * - Interrupted-job recovery on startup
 */

import type { Message, MessageResponse, Job, UserConfig } from "~types";
import { DEFAULT_CONFIG } from "~types/config";
import { StateManager } from "./core/StateManager";
import { JobQueue } from "./core/JobQueue";
import { StorageMonitor } from "./core/StorageMonitor";

// ── Singleton instances ────────────────────────────────────────────────────────

let stateManager: StateManager;
let jobQueue: JobQueue;
let storageMonitor: StorageMonitor;
let systemsInitialised = false;

// ── Initialisation ─────────────────────────────────────────────────────────────

/**
 * Bootstrap all core systems. Called on install, activate, and before
 * the first message is handled (in case the service worker was restarted).
 */
async function initializeSystems(): Promise<void> {
  if (systemsInitialised) return;

  try {
    stateManager = new StateManager();
    jobQueue = new JobQueue(stateManager);
    storageMonitor = new StorageMonitor(stateManager);
    storageMonitor.startMonitoring();

    systemsInitialised = true;
    console.info("[Background] Systems initialised");
  } catch (error) {
    console.error("[Background] Failed to initialise systems:", error);
  }
}

/**
 * Ensure systems are ready before handling any message.
 */
async function ensureInitialised(): Promise<void> {
  if (!systemsInitialised) {
    await initializeSystems();
  }
}

// ── Service Worker Lifecycle ───────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  initializeSystems().then(async () => {
    if (details.reason === "install") {
      console.info("[Background] Extension installed — setting default config");
      await stateManager.saveConfig(DEFAULT_CONFIG);
    } else if (details.reason === "update") {
      console.info("[Background] Extension updated from", details.previousVersion);
    }
  });
});

/**
 * Listen for side panel open action
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// ── Message Handling ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
    ensureInitialised()
      .then(() => handleMessage(message))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: String(error) }));

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

/**
 * Route an incoming message to the appropriate handler.
 */
async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case "START_JOB":
      return handleStartJob(message.payload as { prompt: string });

    case "PAUSE_JOB":
      return handlePauseJob(message.payload as { jobId: string });

    case "RESUME_JOB":
      return handleResumeJob(message.payload as { jobId: string });

    case "CANCEL_JOB":
      return handleCancelJob(message.payload as { jobId: string });

    case "GET_JOB_STATUS":
      return handleGetJobStatus(message.payload as { jobId: string });

    case "GET_CONFIG":
      return handleGetConfig();

    case "UPDATE_CONFIG":
      return handleUpdateConfig(message.payload as Partial<UserConfig>);

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// ── Job Handlers ───────────────────────────────────────────────────────────────

async function handleStartJob(payload: { prompt: string }): Promise<MessageResponse> {
  const { prompt } = payload;

  if (!prompt?.trim()) {
    return { success: false, error: "Prompt is required" };
  }

  console.info("[Background] Starting job with prompt:", prompt);

  const config = await stateManager.getConfig();
  const job: Job = {
    id: crypto.randomUUID(),
    prompt,
    config: {
      llmProvider: config.llm.providers[config.llm.defaultProvider],
      templateMode: "same",
      exportFormat: "png",
    },
    tasks: [],
    status: "queued",
    progress: 0,
    currentTaskIndex: 0,
    createdAt: new Date().toISOString(),
    results: [],
    errors: [],
  };

  await jobQueue.enqueue(job);

  return {
    success: true,
    data: { jobId: job.id, status: job.status, message: "Job created successfully" },
  };
}

async function handlePauseJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;
  if (!jobId) return { success: false, error: "Job ID is required" };

  console.info("[Background] Pausing job:", jobId);
  await stateManager.pauseJob(jobId);

  return { success: true, data: { jobId, status: "paused" } };
}

async function handleResumeJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;
  if (!jobId) return { success: false, error: "Job ID is required" };

  console.info("[Background] Resuming job:", jobId);
  await stateManager.resumeJob(jobId);

  return { success: true, data: { jobId, status: "running" } };
}

async function handleCancelJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;
  if (!jobId) return { success: false, error: "Job ID is required" };

  console.info("[Background] Cancelling job:", jobId);
  await stateManager.cancelJob(jobId);

  return { success: true, data: { jobId, status: "cancelled" } };
}

async function handleGetJobStatus(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;
  if (!jobId) return { success: false, error: "Job ID is required" };

  console.info("[Background] Getting status for job:", jobId);
  const job = await stateManager.getJobState(jobId);

  if (!job) return { success: false, error: `Job ${jobId} not found` };
  return { success: true, data: job };
}

// ── Config Handlers ────────────────────────────────────────────────────────────

async function handleGetConfig(): Promise<MessageResponse> {
  console.info("[Background] Getting config");
  const config = await stateManager.getConfig();
  return { success: true, data: config };
}

async function handleUpdateConfig(payload: Partial<UserConfig>): Promise<MessageResponse> {
  console.info("[Background] Updating config");
  await stateManager.updateConfig(payload);
  return { success: true };
}

// ── Interrupted Job Recovery ───────────────────────────────────────────────────

/**
 * On startup, check for jobs that were running when the service worker
 * was terminated and resume them.
 */
async function resumeInterruptedJobs(): Promise<void> {
  try {
    const activeJob = await stateManager.getActiveJob();
    if (activeJob && activeJob.status === "running") {
      console.info("[Background] Resuming interrupted job:", activeJob.id);
      await stateManager.resumeJob(activeJob.id);
    }
  } catch (error) {
    console.error("[Background] Failed to resume interrupted jobs:", error);
  }
}

// Kick off initialisation and recovery immediately
initializeSystems().then(() => resumeInterruptedJobs());

// ── Global Error Handling ──────────────────────────────────────────────────────

self.addEventListener("error", (event) => {
  console.error("[Background] Unhandled error:", event.error);
  if (stateManager) {
    stateManager
      .saveLogs([
        {
          level: "error",
          message: event.error?.message ?? "Unknown error",
          timestamp: new Date().toISOString(),
          context: { stack: event.error?.stack },
        },
      ])
      .catch(() => {
        /* best effort */
      });
  }
});

// Re-export for testing
export { initializeSystems, handleMessage, resumeInterruptedJobs, ensureInitialised };
