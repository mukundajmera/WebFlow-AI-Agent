/**
 * BrowserAI Craft Background Service Worker
 * Main entry point for the extension's background logic
 */

import type { Message, MessageResponse } from "~types";

/**
 * Handle messages from the side panel and content scripts
 */
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
    handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: String(error) }));

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

/**
 * Process incoming messages
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
      return handleUpdateConfig(message.payload);

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Start a new automation job
 */
async function handleStartJob(payload: { prompt: string }): Promise<MessageResponse> {
  const { prompt } = payload;

  if (!prompt?.trim()) {
    return { success: false, error: "Prompt is required" };
  }

  // TODO: Implement job creation and orchestration
  console.info("[Background] Starting job with prompt:", prompt);

  return {
    success: true,
    data: {
      jobId: crypto.randomUUID(),
      status: "queued",
      message: "Job created successfully",
    },
  };
}

/**
 * Pause a running job
 */
async function handlePauseJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;

  if (!jobId) {
    return { success: false, error: "Job ID is required" };
  }

  // TODO: Implement job pausing
  console.info("[Background] Pausing job:", jobId);

  return { success: true, data: { jobId, status: "paused" } };
}

/**
 * Resume a paused job
 */
async function handleResumeJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;

  if (!jobId) {
    return { success: false, error: "Job ID is required" };
  }

  // TODO: Implement job resuming
  console.info("[Background] Resuming job:", jobId);

  return { success: true, data: { jobId, status: "running" } };
}

/**
 * Cancel a job
 */
async function handleCancelJob(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;

  if (!jobId) {
    return { success: false, error: "Job ID is required" };
  }

  // TODO: Implement job cancellation
  console.info("[Background] Cancelling job:", jobId);

  return { success: true, data: { jobId, status: "cancelled" } };
}

/**
 * Get the status of a job
 */
async function handleGetJobStatus(payload: { jobId: string }): Promise<MessageResponse> {
  const { jobId } = payload;

  if (!jobId) {
    return { success: false, error: "Job ID is required" };
  }

  // TODO: Implement job status retrieval
  console.info("[Background] Getting status for job:", jobId);

  return { success: true, data: { jobId, status: "unknown" } };
}

/**
 * Get current configuration
 */
async function handleGetConfig(): Promise<MessageResponse> {
  // TODO: Implement config retrieval from storage
  console.info("[Background] Getting config");

  return { success: true, data: {} };
}

/**
 * Update configuration
 */
async function handleUpdateConfig(payload: unknown): Promise<MessageResponse> {
  // TODO: Implement config update
  console.info("[Background] Updating config:", payload);

  return { success: true };
}

/**
 * Listen for extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.info("[Background] Extension installed");
    // TODO: Initialize default settings
  } else if (details.reason === "update") {
    console.info("[Background] Extension updated from", details.previousVersion);
    // TODO: Handle migration if needed
  }
});

/**
 * Listen for side panel open action
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
