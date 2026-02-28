/**
 * Orchestration types for job and task management
 */

import type { ActionResult } from "./common";
import type { LLMConfig } from "./llm";
import type { Screenshot } from "./vision";
import type { BrowserAction, DOMState } from "./browser";
import type { AssetCollection, DataRow, DataSource } from "./data";

/**
 * Mapping between design fields and data columns
 */
export interface DataMapping {
  [designField: string]: string;
}

/**
 * A job represents a complete automation request
 */
export interface Job {
  /** Unique job identifier (UUID) */
  id: string;
  /** Original user prompt */
  prompt: string;
  config: JobConfig;
  tasks: Task[];
  status: JobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  currentTaskIndex: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  results: DesignResult[];
  errors: JobError[];
}

/**
 * Job execution status
 */
export type JobStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";

/**
 * Configuration for a job
 */
export interface JobConfig {
  llmProvider: LLMConfig;
  dataSource?: DataSource;
  /** How to handle templates */
  templateMode: "same" | "copy" | "new";
  exportFormat: "png" | "pdf" | "jpg" | "mp4";
  assets?: AssetCollection;
  /** Enable parallel task execution */
  parallel?: boolean;
  maxConcurrent?: number;
}

/**
 * A task is a single unit of work within a job
 */
export interface Task {
  id: string;
  name: string;
  type: TaskType;
  /** Human-readable goal description */
  goal: string;
  /** Whether this task requires visual analysis */
  requiresVision: boolean;
  /** IDs of tasks that must complete first */
  dependencies: string[];
  status: TaskStatus;
  attempts: number;
  result?: ActionResult;
  error?: string;
}

/**
 * Types of tasks
 */
export type TaskType =
  | "navigation"
  | "search"
  | "select"
  | "edit_text"
  | "replace_image"
  | "export"
  | "vision_select"
  | "bulk_generate"
  | "data_load"
  | "custom";

/**
 * Task execution status
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/**
 * A plan containing multiple tasks
 */
export interface TaskPlan {
  tasks: Task[];
  strategy: "sequential" | "parallel";
  /** Estimated duration in seconds */
  estimatedDuration?: number;
}

/**
 * Context available during task execution
 */
export interface ExecutionContext {
  sessionId: string;
  dataSource?: DataSource;
  dataRows?: DataRow[];
  assets?: AssetCollection;
  config: JobConfig;
  /** Adapter name - actual adapter instance is resolved at runtime */
  adapterName: string;
  /** Dynamic variables set during execution */
  variables?: Record<string, unknown>;
}

/**
 * Knowledge base for an adapter (simplified for orchestration use)
 */
export interface AdapterKnowledgeBase {
  /** Map of element names to CSS selectors */
  selectors: Record<string, string>;
  /** Tips for working with this site */
  tips?: string[];
}

/**
 * Observation state for the Think phase
 */
export interface Observation {
  screenshot?: Screenshot;
  domState: DOMState;
  task: Task;
  adapterKnowledge: AdapterKnowledgeBase;
  previousActions: BrowserAction[];
  attempt: number;
}

/**
 * Parsed representation of a user prompt
 */
export interface ParsedPrompt {
  action: "create" | "modify" | "duplicate" | "export";
  /** Number of items to create */
  count: number;
  /** Style preferences */
  style?: string;
  templatePreference: "same" | "copy" | "new";
  exportFormat: "png" | "pdf" | "jpg" | "mp4";
  dataMapping?: DataMapping;
  additionalInstructions?: string;
}

/**
 * Error that occurred during job execution
 */
export interface JobError {
  taskId: string;
  taskName: string;
  error: string;
  screenshot?: string;
  timestamp: string;
  recoveryAttempted: boolean;
  recoverySucceeded?: boolean;
}

/**
 * Result from completing a design task
 */
export interface DesignResult {
  taskId: string;
  /** Platform-specific design ID */
  designId?: string;
  /** URL to exported file */
  exportUrl?: string;
  /** Local file path if downloaded */
  localPath?: string;
  /** Thumbnail image (base64) */
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Filter criteria for listing jobs
 */
export interface JobFilter {
  status?: JobStatus[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

/**
 * Message types for background/UI communication
 */
export type MessageType =
  | "START_JOB"
  | "PAUSE_JOB"
  | "RESUME_JOB"
  | "CANCEL_JOB"
  | "GET_JOB_STATUS"
  | "GET_ALL_JOBS"
  | "UPDATE_CONFIG"
  | "GET_CONFIG"
  | "TEST_LLM_CONNECTION";

/**
 * Message payload structure
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * Response from message handlers
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
