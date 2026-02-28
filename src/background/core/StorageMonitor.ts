/**
 * Monitors Chrome storage usage and triggers cleanup when thresholds are exceeded.
 */

import type { StateManager } from "./StateManager";

export interface StorageReport {
  totalUsed: number;
  totalLimit: number;
  percentage: number;
  breakdown: {
    jobs: number;
    screenshots: number;
    logs: number;
    config: number;
    cache: number;
  };
  recommendations: string[];
}

const STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 95;

export class StorageMonitor {
  private stateManager: StateManager;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Start periodic storage monitoring at the given interval.
   */
  startMonitoring(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (this.intervalId !== null) {
      console.info("[StorageMonitor] Already monitoring");
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkAndCleanup().catch((error) => {
        console.error("[StorageMonitor] Check failed:", error);
      });
    }, intervalMs);

    console.info("[StorageMonitor] Started monitoring every", intervalMs, "ms");
  }

  /**
   * Stop the periodic monitoring.
   */
  stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.info("[StorageMonitor] Stopped monitoring");
    }
  }

  /**
   * Check storage usage and run cleanup when thresholds are exceeded.
   * At 80%: clean old jobs and cache.
   * At 95%: aggressively clean jobs older than 3 days and clear logs.
   */
  async checkAndCleanup(): Promise<void> {
    const usage = await this.stateManager.checkStorageUsage();
    console.debug("[StorageMonitor] Storage usage:", usage.percentage + "%");

    if (usage.percentage >= CRITICAL_THRESHOLD) {
      console.info("[StorageMonitor] Critical storage usage, aggressive cleanup");
      await this.stateManager.cleanupOldJobs(3);
      await this.stateManager.cleanupCache();
      await this.stateManager.clearLogs();
    } else if (usage.percentage >= WARNING_THRESHOLD) {
      console.info("[StorageMonitor] High storage usage, running cleanup");
      await this.stateManager.cleanupOldJobs(14);
      await this.stateManager.cleanupCache();
    }
  }

  /**
   * Generate a detailed storage usage report with breakdown and recommendations.
   */
  async getStorageReport(): Promise<StorageReport> {
    try {
      const [jobsBytes, logsBytes, configBytes, cacheBytes, totalUsed] = await Promise.all([
        chrome.storage.local.getBytesInUse("browserai_jobs_index"),
        chrome.storage.local.getBytesInUse("browserai_logs"),
        chrome.storage.local.getBytesInUse("browserai_config"),
        chrome.storage.local.getBytesInUse("browserai_cache"),
        chrome.storage.local.getBytesInUse(null),
      ]);

      // Jobs include index + individual job entries; approximate screenshots within jobs
      const screenshotsEstimate = 0;
      const jobsTotalBytes = totalUsed - logsBytes - configBytes - cacheBytes;

      const percentage = Math.round((totalUsed / STORAGE_LIMIT) * 100);

      const recommendations: string[] = [];
      if (percentage >= CRITICAL_THRESHOLD) {
        recommendations.push("Critical: Storage nearly full. Delete old jobs immediately.");
        recommendations.push("Clear logs and cache to free space.");
      } else if (percentage >= WARNING_THRESHOLD) {
        recommendations.push("Storage usage is high. Consider cleaning up old jobs.");
        recommendations.push("Review and clear unnecessary cached data.");
      }
      if (logsBytes > STORAGE_LIMIT * 0.2) {
        recommendations.push(
          "Logs are using significant storage. Consider exporting and clearing."
        );
      }

      return {
        totalUsed,
        totalLimit: STORAGE_LIMIT,
        percentage,
        breakdown: {
          jobs: jobsTotalBytes > 0 ? jobsTotalBytes : jobsBytes,
          screenshots: screenshotsEstimate,
          logs: logsBytes,
          config: configBytes,
          cache: cacheBytes,
        },
        recommendations,
      };
    } catch (error) {
      console.error("[StorageMonitor] Failed to generate report:", error);
      return {
        totalUsed: 0,
        totalLimit: STORAGE_LIMIT,
        percentage: 0,
        breakdown: { jobs: 0, screenshots: 0, logs: 0, config: 0, cache: 0 },
        recommendations: ["Unable to generate storage report."],
      };
    }
  }
}
