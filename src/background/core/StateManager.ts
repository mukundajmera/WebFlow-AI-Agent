/**
 * Central state management for jobs, configuration, and logs.
 * Uses Chrome Storage API for persistence.
 */

import type { Job, JobStatus, TaskStatus } from '~types/orchestration';
import type { LogLevel, LogEntry } from '~types/common';
import type { UserConfig } from '~types/config';
import { DEFAULT_CONFIG } from '~types/config';

// ── Storage Keys ──────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  JOBS: 'browserai_jobs',
  ACTIVE_JOB: 'browserai_active_job',
  CONFIG: 'browserai_config',
  LOGS: 'browserai_logs',
  CACHE: 'browserai_cache',
  JOBS_INDEX: 'browserai_jobs_index',
  STORAGE_VERSION: 'browserai_storage_version',
};

const CURRENT_STORAGE_VERSION = '1.0.0';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 1000;
const STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB
const ENCRYPT_PREFIX = 'enc:';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface StateChangeEvent {
  type:
    | 'job_updated'
    | 'job_created'
    | 'job_deleted'
    | 'task_updated'
    | 'config_updated'
    | 'active_job_changed'
    | 'job_paused'
    | 'job_resumed'
    | 'job_cancelled'
    | 'logs_cleared'
    | 'cache_cleared';
  jobId?: string;
  taskId?: string;
  status?: string;
}

export interface LogFilter {
  level?: LogLevel;
  jobId?: string;
  fromDate?: string;
  toDate?: string;
}

// ── StateManager ──────────────────────────────────────────────────────────────

export class StateManager {
  private listeners: Array<(event: StateChangeEvent) => void> = [];

  constructor() {
    this.initialize();
  }

  // ── Initialization ────────────────────────────────────────────────────────

  private async initialize(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.STORAGE_VERSION);
      const storedVersion = result[STORAGE_KEYS.STORAGE_VERSION] as string | undefined;

      if (!storedVersion) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.STORAGE_VERSION]: CURRENT_STORAGE_VERSION,
          [STORAGE_KEYS.JOBS_INDEX]: [],
        });
        console.info('[StateManager] Initialized storage with version', CURRENT_STORAGE_VERSION);
      } else if (storedVersion !== CURRENT_STORAGE_VERSION) {
        await this.migrateStorage(storedVersion, CURRENT_STORAGE_VERSION);
      }
    } catch (error) {
      console.error('[StateManager] Initialization error:', error);
    }
  }

  // ── Job Methods ───────────────────────────────────────────────────────────

  /**
   * Persist a job to storage. Recalculates progress and updates timestamps.
   */
  async saveJobState(job: Job): Promise<void> {
    try {
      const completedTasks = job.tasks.filter(
        (t: { status: string }) => t.status === 'completed' || t.status === 'skipped',
      ).length;
      job.progress = job.tasks.length > 0 ? Math.round((completedTasks / job.tasks.length) * 100) : 0;

      const storageKey = `${STORAGE_KEYS.JOBS}_${job.id}`;
      await chrome.storage.local.set({ [storageKey]: JSON.parse(JSON.stringify(job)) });

      // Update jobs index
      const index = await this.getJobsIndex();
      if (!index.includes(job.id)) {
        index.push(job.id);
        await chrome.storage.local.set({ [STORAGE_KEYS.JOBS_INDEX]: index });
        this.emitStateChange({ type: 'job_created', jobId: job.id, status: job.status });
      } else {
        this.emitStateChange({ type: 'job_updated', jobId: job.id, status: job.status });
      }

      await this.checkStorageUsage();
      console.debug('[StateManager] Saved job', job.id);
    } catch (error) {
      console.error('[StateManager] Failed to save job:', error);
      throw error;
    }
  }

  /**
   * Load a single job from storage by ID.
   */
  async getJobState(jobId: string): Promise<Job | null> {
    try {
      const storageKey = `${STORAGE_KEYS.JOBS}_${jobId}`;
      const result = await chrome.storage.local.get(storageKey);
      return (result[storageKey] as Job) ?? null;
    } catch (error) {
      console.error('[StateManager] Failed to get job:', error);
      return null;
    }
  }

  /**
   * Load all jobs from the index, sorted by createdAt descending.
   */
  async getAllJobs(): Promise<Job[]> {
    try {
      const index = await this.getJobsIndex();
      const jobs = await Promise.all(index.map((id) => this.getJobState(id)));
      return (jobs.filter(Boolean) as Job[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error('[StateManager] Failed to get all jobs:', error);
      return [];
    }
  }

  /**
   * Return the currently active (running) job, if any.
   */
  async getActiveJob(): Promise<Job | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_JOB);
      const activeJobId = result[STORAGE_KEYS.ACTIVE_JOB] as string | undefined;
      if (!activeJobId) return null;
      return this.getJobState(activeJobId);
    } catch (error) {
      console.error('[StateManager] Failed to get active job:', error);
      return null;
    }
  }

  /**
   * Set or clear the active job.
   */
  async setActiveJob(jobId: string | null): Promise<void> {
    try {
      if (jobId === null) {
        await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_JOB);
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_JOB]: jobId });
      }
      this.emitStateChange({ type: 'active_job_changed', jobId: jobId ?? undefined });
      console.info('[StateManager] Active job set to', jobId);
    } catch (error) {
      console.error('[StateManager] Failed to set active job:', error);
      throw error;
    }
  }

  /**
   * Update the status of a specific task within a job and recalculate progress.
   */
  async updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    result?: unknown,
  ): Promise<void> {
    const job = await this.getJobState(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const task = job.tasks.find((t: { id: string }) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in job ${jobId}`);
    }

    task.status = status;
    if (result !== undefined) {
      task.result = result as any;
    }

    await this.saveJobState(job);
    this.emitStateChange({ type: 'task_updated', jobId, taskId, status });
  }

  /**
   * Pause a running job, preserving the current task index.
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = await this.getJobState(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'paused';
    await this.saveJobState(job);
    this.emitStateChange({ type: 'job_paused', jobId, status: 'paused' });
    console.info('[StateManager] Paused job', jobId);
  }

  /**
   * Resume a paused job from its saved position.
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = await this.getJobState(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'running';
    await this.saveJobState(job);
    this.emitStateChange({ type: 'job_resumed', jobId, status: 'running' });
    console.info('[StateManager] Resumed job', jobId);
  }

  /**
   * Cancel a job and mark it as completed with a cancelled status.
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJobState(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    await this.saveJobState(job);
    this.emitStateChange({ type: 'job_cancelled', jobId, status: 'cancelled' });
    console.info('[StateManager] Cancelled job', jobId);
  }

  /**
   * Permanently delete a job from storage and the index.
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const storageKey = `${STORAGE_KEYS.JOBS}_${jobId}`;
      await chrome.storage.local.remove(storageKey);

      const index = await this.getJobsIndex();
      const updated = index.filter((id) => id !== jobId);
      await chrome.storage.local.set({ [STORAGE_KEYS.JOBS_INDEX]: updated });

      this.emitStateChange({ type: 'job_deleted', jobId });
      console.info('[StateManager] Deleted job', jobId);
    } catch (error) {
      console.error('[StateManager] Failed to delete job:', error);
      throw error;
    }
  }

  /**
   * Return the N most recent jobs, sorted by createdAt descending.
   */
  async getRecentJobs(limit: number = 10): Promise<Job[]> {
    const jobs = await this.getAllJobs();
    return jobs.slice(0, limit);
  }

  /**
   * Filter all jobs by a specific status.
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    const jobs = await this.getAllJobs();
    return jobs.filter((j) => j.status === status);
  }

  // ── Config Methods ────────────────────────────────────────────────────────

  /**
   * Save the full user configuration, encrypting API keys.
   */
  async saveConfig(config: UserConfig): Promise<void> {
    try {
      if (!config || !config.llm || !config.vision || !config.browser) {
        throw new Error('Invalid configuration: missing required sections');
      }

      const serializable = JSON.parse(JSON.stringify(config)) as UserConfig;
      this.encryptConfigKeys(serializable);

      await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: serializable });
      this.emitStateChange({ type: 'config_updated' });
      console.info('[StateManager] Configuration saved');
    } catch (error) {
      console.error('[StateManager] Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Load the user configuration or return the default.
   */
  async getConfig(): Promise<UserConfig> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
      const config = result[STORAGE_KEYS.CONFIG] as UserConfig | undefined;
      if (!config) return { ...DEFAULT_CONFIG };

      this.decryptConfigKeys(config);
      return config;
    } catch (error) {
      console.error('[StateManager] Failed to get config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Merge partial configuration changes with the current configuration.
   */
  async updateConfig(partial: Partial<UserConfig>): Promise<void> {
    const current = await this.getConfig();
    const merged = this.deepMerge(current, partial) as UserConfig;
    await this.saveConfig(merged);
  }

  // ── Logging Methods ───────────────────────────────────────────────────────

  /**
   * Append log entries, keeping only the most recent entries (FIFO at MAX_LOG_ENTRIES).
   */
  async saveLogs(entries: LogEntry[]): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
      const existing = (result[STORAGE_KEYS.LOGS] as LogEntry[]) ?? [];
      const combined = [...existing, ...entries].slice(-MAX_LOG_ENTRIES);
      await chrome.storage.local.set({ [STORAGE_KEYS.LOGS]: combined });
      console.debug('[StateManager] Saved', entries.length, 'log entries');
    } catch (error) {
      console.error('[StateManager] Failed to save logs:', error);
      throw error;
    }
  }

  /**
   * Retrieve logs with optional filtering by level, jobId, and date range.
   */
  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
      let logs = (result[STORAGE_KEYS.LOGS] as LogEntry[]) ?? [];

      if (filter) {
        if (filter.level) {
          logs = logs.filter((l) => l.level === filter.level);
        }
        if (filter.jobId) {
          logs = logs.filter(
            (l) => l.context && (l.context as Record<string, unknown>).jobId === filter.jobId,
          );
        }
        if (filter.fromDate) {
          const from = new Date(filter.fromDate).getTime();
          logs = logs.filter((l) => new Date(l.timestamp).getTime() >= from);
        }
        if (filter.toDate) {
          const to = new Date(filter.toDate).getTime();
          logs = logs.filter((l) => new Date(l.timestamp).getTime() <= to);
        }
      }

      return logs;
    } catch (error) {
      console.error('[StateManager] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Remove all stored logs.
   */
  async clearLogs(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.LOGS);
    this.emitStateChange({ type: 'logs_cleared' });
    console.info('[StateManager] Logs cleared');
  }

  /**
   * Serialize all logs to a JSON string for export.
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // ── Cleanup Methods ───────────────────────────────────────────────────────

  /**
   * Remove jobs older than a specified number of days.
   */
  async cleanupOldJobs(maxAgeDays: number = 30): Promise<void> {
    try {
      const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      const jobs = await this.getAllJobs();
      const toDelete = jobs.filter((j) => new Date(j.createdAt).getTime() < cutoff);

      for (const job of toDelete) {
        await this.deleteJob(job.id);
      }

      console.info('[StateManager] Cleaned up', toDelete.length, 'old jobs');
    } catch (error) {
      console.error('[StateManager] Failed to cleanup old jobs:', error);
    }
  }

  /**
   * Check current storage usage against the Chrome local storage limit.
   */
  async checkStorageUsage(): Promise<{ used: number; limit: number; percentage: number }> {
    try {
      const used = await chrome.storage.local.getBytesInUse(null);
      const percentage = Math.round((used / STORAGE_LIMIT) * 100);
      return { used, limit: STORAGE_LIMIT, percentage };
    } catch (error) {
      console.error('[StateManager] Failed to check storage usage:', error);
      return { used: 0, limit: STORAGE_LIMIT, percentage: 0 };
    }
  }

  /**
   * Clear the cache key from storage.
   */
  async cleanupCache(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.CACHE);
    this.emitStateChange({ type: 'cache_cleared' });
    console.info('[StateManager] Cache cleared');
  }

  /**
   * Ensure enough storage space is available, cleaning up if needed.
   */
  async ensureStorageSpace(requiredBytes: number): Promise<void> {
    const { used, limit } = await this.checkStorageUsage();
    if (used + requiredBytes > limit) {
      console.info('[StateManager] Storage low, running cleanup');
      await this.cleanupOldJobs(7);
      await this.cleanupCache();

      const afterCleanup = await this.checkStorageUsage();
      if (afterCleanup.used + requiredBytes > limit) {
        throw new Error('Insufficient storage space after cleanup');
      }
    }
  }

  // ── Encryption (simple obfuscation) ───────────────────────────────────────

  /**
   * Encode an API key with a recognizable prefix using base64.
   * NOTE: This is simple obfuscation, not cryptographic security.
   * Acceptable in Chrome extension context where storage is already sandboxed.
   */
  encryptApiKey(key: string): string {
    if (!key || key.startsWith(ENCRYPT_PREFIX)) return key;
    return ENCRYPT_PREFIX + btoa(key);
  }

  /**
   * Decode a previously encrypted API key.
   */
  decryptApiKey(encrypted: string): string {
    if (!encrypted || !encrypted.startsWith(ENCRYPT_PREFIX)) return encrypted;
    return atob(encrypted.slice(ENCRYPT_PREFIX.length));
  }

  // ── Event Emitter ─────────────────────────────────────────────────────────

  /**
   * Emit a state change event to all listeners and via chrome.runtime.
   */
  emitStateChange(event: StateChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[StateManager] Listener error:', error);
      }
    }

    try {
      chrome.runtime.sendMessage({ type: 'STATE_CHANGE', payload: event }).catch(() => {
        // Ignore errors when no listeners are available
      });
    } catch {
      // chrome.runtime may not be available in all contexts
    }
  }

  /**
   * Subscribe to state change events.
   */
  onStateChange(callback: (event: StateChangeEvent) => void): void {
    this.listeners.push(callback);
  }

  // ── Migration ─────────────────────────────────────────────────────────────

  /**
   * Migrate storage data between versions.
   */
  async migrateStorage(fromVersion: string, toVersion: string): Promise<void> {
    console.info('[StateManager] Migrating storage from', fromVersion, 'to', toVersion);
    // Future migrations go here
    await chrome.storage.local.set({ [STORAGE_KEYS.STORAGE_VERSION]: toVersion });
    console.info('[StateManager] Migration complete');
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async getJobsIndex(): Promise<string[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.JOBS_INDEX);
    return (result[STORAGE_KEYS.JOBS_INDEX] as string[]) ?? [];
  }

  private encryptConfigKeys(config: UserConfig): void {
    for (const providerConfig of Object.values(config.llm.providers)) {
      const provider = providerConfig as unknown as Record<string, unknown>;
      if ('apiKey' in provider && typeof provider.apiKey === 'string') {
        provider.apiKey = this.encryptApiKey(provider.apiKey);
      }
    }
  }

  private decryptConfigKeys(config: UserConfig): void {
    for (const providerConfig of Object.values(config.llm.providers)) {
      const provider = providerConfig as unknown as Record<string, unknown>;
      if ('apiKey' in provider && typeof provider.apiKey === 'string') {
        provider.apiKey = this.decryptApiKey(provider.apiKey);
      }
    }
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }
}
