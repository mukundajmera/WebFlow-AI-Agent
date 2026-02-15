/**
 * Vision and multimodal AI types
 */

import type { BoundingBox } from "./common";

/**
 * Result from visual analysis of a screenshot
 */
export interface VisionResult {
  description: string;
  elements: DetectedElement[];
  /** Overall confidence (0-1) */
  confidence: number;
  timestamp: string;
}

/**
 * An element detected by vision analysis
 */
export interface DetectedElement {
  type: ElementType;
  bbox: BoundingBox;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Human-readable label */
  label: string;
  /** Additional detected attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Types of UI elements that can be detected
 */
export type ElementType =
  | "button"
  | "input"
  | "link"
  | "image"
  | "text"
  | "dropdown"
  | "checkbox"
  | "canvas"
  | "menu"
  | "dialog"
  | "unknown";

/**
 * Result of attempting to locate an element visually
 */
export interface ElementLocation {
  found: boolean;
  bbox?: BoundingBox;
  /** Location confidence (0-1) */
  confidence: number;
  /** CSS selector if it can be inferred from visual analysis */
  selector?: string;
  /** Annotated screenshot highlighting the element */
  screenshot?: string;
}

/**
 * A visual anchor point for element identification
 */
export interface VisualAnchor {
  /** Description like "The blue Export button in top right" */
  description: string;
  location: ElementLocation;
  /** Alternative locations if primary fails */
  alternatives?: ElementLocation[];
}

/**
 * Aesthetic scoring criteria for design evaluation
 */
export interface AestheticScore {
  /** Overall score (0-100) */
  score: number;
  /** Explanation of the score */
  reasoning: string;
  criteria: {
    typography: number;
    colorPalette: number;
    layout: number;
    whitespace: number;
    overall: number;
  };
}

/**
 * Result of matching a design against a style reference
 */
export interface StyleMatch {
  templateId: string;
  score: AestheticScore;
  /** Screenshot of the matched template */
  screenshot: string;
}

/**
 * Result of verifying task completion visually
 */
export interface VerificationResult {
  success: boolean;
  reasoning: string;
  /** Verification confidence (0-1) */
  confidence: number;
  /** Screenshot at time of verification */
  screenshot?: string;
  /** List of issues found during verification */
  issues?: string[];
}

/**
 * A captured screenshot
 */
export interface Screenshot {
  /** Base64 encoded image data */
  data: string;
  format: "png" | "jpeg";
  width: number;
  height: number;
  timestamp: string;
  /** Whether the screenshot data has been compressed */
  isCompressed: boolean;
}

/**
 * Options for capturing screenshots
 */
export interface ScreenshotOptions {
  /** Quality (0-100) for JPEG */
  quality?: number;
  format?: "png" | "jpeg";
  /** Capture full page vs viewport */
  fullPage?: boolean;
  /** Specific region to capture */
  region?: BoundingBox;
  /** Maximum width (resize if larger) */
  maxWidth?: number;
}
