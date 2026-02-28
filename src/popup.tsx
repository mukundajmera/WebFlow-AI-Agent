import { useState, useEffect, useCallback } from "react";

/**
 * BrowserAI Craft Popup
 * Quick-access popup for the extension action button.
 *
 * Provides:
 *  - LLM connection status indicator
 *  - Quick-start job from a prompt
 *  - Link to open the full side panel
 *  - Active job count badge
 */

interface ConnectionStatus {
  provider: string;
  connected: boolean;
  detail?: string;
}

interface JobSummary {
  total: number;
  running: number;
}

function Popup() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [jobs, setJobs] = useState<JobSummary>({ total: 0, running: 0 });
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch status on mount ──────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: "TEST_LLM_CONNECTION" });
      if (res?.success && res.data) {
        setStatus({
          provider: res.data.provider ?? "unknown",
          connected: res.data.reachable ?? res.data.hasApiKey ?? false,
          detail: res.data.reachable ? "reachable" : res.data.hasApiKey ? "API key set" : "not configured",
        });
      } else {
        setStatus({ provider: "unknown", connected: false, detail: res?.error });
      }
    } catch {
      setStatus({ provider: "unknown", connected: false, detail: "Service worker unavailable" });
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_ALL_JOBS" });
      if (res?.success && Array.isArray(res.data?.jobs)) {
        const all = res.data.jobs;
        setJobs({
          total: all.length,
          running: all.filter((j: { status: string }) => j.status === "running").length,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchJobs();
  }, [fetchStatus, fetchJobs]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleQuickStart = async () => {
    if (!prompt.trim()) return;
    setSubmitting(true);
    try {
      await chrome.runtime.sendMessage({
        type: "START_JOB",
        payload: { prompt },
      });
      setPrompt("");
      await fetchJobs();
    } catch (error) {
      console.error("Failed to start job:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: 320, fontFamily: "system-ui, sans-serif", padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🤖 BrowserAI Craft</h1>
        {jobs.running > 0 && (
          <span
            style={{
              background: "#3b82f6",
              color: "#fff",
              borderRadius: 12,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {jobs.running} running
          </span>
        )}
      </div>

      {/* Connection Status */}
      <div
        role="status"
        aria-label={`LLM connection: ${status?.connected ? "connected" : "disconnected"}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          background: status?.connected ? "#ecfdf5" : "#fef2f2",
          marginBottom: 12,
          fontSize: 13,
        }}
      >
        <span
          aria-hidden="true"
          style={{ fontSize: 10, color: status?.connected ? "#10b981" : "#ef4444" }}
        >
          ●
        </span>
        <span>
          {status ? `${status.provider}: ${status.detail}` : "Checking connection…"}
        </span>
      </div>

      {/* Quick Start */}
      <label htmlFor="quick-start-prompt" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
        Task prompt
      </label>
      <textarea
        id="quick-start-prompt"
        aria-label="Quick start: describe your task"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Quick start: describe your task…"
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          fontSize: 13,
          resize: "none",
          marginBottom: 8,
        }}
      />

      <button
        aria-label={submitting ? "Starting job" : "Start job"}
        onClick={handleQuickStart}
        disabled={submitting || !prompt.trim()}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 8,
          border: "none",
          background: submitting || !prompt.trim() ? "#93c5fd" : "#3b82f6",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          cursor: submitting || !prompt.trim() ? "not-allowed" : "pointer",
          marginBottom: 8,
        }}
      >
        {submitting ? "Starting…" : "Start Job"}
      </button>

      {/* Open Side Panel */}
      <button
        aria-label="Open full side panel"
        onClick={openSidePanel}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "transparent",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Open Full Panel →
      </button>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10, marginBottom: 0 }}>
        {jobs.total} total jobs
      </p>
    </div>
  );
}

export default Popup;
