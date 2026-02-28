/**
 * Job queue management with sequential processing.
 */

import type { Job } from "~types/orchestration";
import type { StateManager } from "./StateManager";

export class JobQueue {
  private queue: Job[] = [];
  private processing = false;
  private stopRequested = false;
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.loadQueuedJobs();
  }

  // ── Queue Operations ────────────────────────────────────────────────────

  /**
   * Add a job to the end of the queue and persist it with queued status.
   */
  async enqueue(job: Job): Promise<void> {
    job.status = "queued";
    this.queue.push(job);
    await this.stateManager.saveJobState(job);
    console.info("[JobQueue] Enqueued job", job.id, "— queue length:", this.queue.length);
  }

  /**
   * Remove and return the next queued job from the front of the queue.
   */
  async dequeue(): Promise<Job | null> {
    const index = this.queue.findIndex((j) => j.status === "queued");
    if (index === -1) return null;

    const [job] = this.queue.splice(index, 1);
    return job;
  }

  /**
   * Begin the processing loop. Dequeues and executes jobs sequentially.
   */
  async startProcessing(executeJob: (job: Job) => Promise<void>): Promise<void> {
    if (this.processing) {
      console.info("[JobQueue] Already processing");
      return;
    }

    this.processing = true;
    this.stopRequested = false;
    console.info("[JobQueue] Started processing");

    while (!this.stopRequested) {
      const job = await this.dequeue();
      if (!job) break;

      try {
        job.status = "running";
        job.startedAt = new Date().toISOString();
        await this.stateManager.saveJobState(job);
        await this.stateManager.setActiveJob(job.id);

        await executeJob(job);
      } catch (error) {
        console.error("[JobQueue] Job execution failed:", job.id, error);
        job.status = "failed";
        job.completedAt = new Date().toISOString();
        job.errors.push({
          taskId: "",
          taskName: "queue_execution",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          recoveryAttempted: false,
        });
        await this.stateManager.saveJobState(job);
      } finally {
        await this.stateManager.setActiveJob(null);
      }
    }

    this.processing = false;
    console.info("[JobQueue] Stopped processing");
  }

  /**
   * Signal the processing loop to stop after the current job completes.
   */
  async stopProcessing(): Promise<void> {
    this.stopRequested = true;
    console.info("[JobQueue] Stop requested");
  }

  /**
   * Return all jobs currently in the queue with queued status.
   */
  getQueuedJobs(): Job[] {
    return this.queue.filter((j) => j.status === "queued");
  }

  /**
   * Get the 1-indexed position of a job in the queue. Returns -1 if not found.
   */
  getQueuePosition(jobId: string): number {
    const queued = this.getQueuedJobs();
    const index = queued.findIndex((j) => j.id === jobId);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * Remove a job from the queue and cancel it.
   */
  async removeFromQueue(jobId: string): Promise<void> {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.stateManager.cancelJob(jobId);
      console.info("[JobQueue] Removed job", jobId, "from queue");
    }
  }

  /**
   * Move a job to the front of the queue.
   */
  async prioritizeJob(jobId: string): Promise<void> {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index > 0) {
      const [job] = this.queue.splice(index, 1);
      this.queue.unshift(job);
      console.info("[JobQueue] Prioritized job", jobId);
    }
  }

  /**
   * Return the current queue length.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Whether the queue is currently processing jobs.
   */
  isProcessing(): boolean {
    return this.processing;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async loadQueuedJobs(): Promise<void> {
    try {
      const jobs = await this.stateManager.getJobsByStatus("queued");
      this.queue = jobs;
      console.info("[JobQueue] Loaded", jobs.length, "queued jobs from storage");
    } catch (error) {
      console.error("[JobQueue] Failed to load queued jobs:", error);
    }
  }
}
