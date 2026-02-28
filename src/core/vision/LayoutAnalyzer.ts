/**
 * LayoutAnalyzer — Uses a VisionAgent to understand the spatial structure
 * of a page: hierarchy, grid layout, text layers, and image placeholders.
 */

import type { BoundingBox } from "~types/common";
import type { VisionAgent } from "./VisionAgent";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

export interface LayoutHierarchy {
  levels: string[];
  structure: HierarchyNode[];
}

export interface HierarchyNode {
  level: string;
  content: string;
  bbox: BoundingBox;
  children?: HierarchyNode[];
}

export interface GridStructure {
  rows: number;
  columns: number;
  cellSize: { width: number; height: number };
  gaps: { horizontal: number; vertical: number };
}

export interface TextLayer {
  content: string;
  bbox: BoundingBox;
  level: "h1" | "h2" | "h3" | "body" | "caption";
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: "left" | "center" | "right";
  };
}

export interface ImagePlaceholder {
  bbox: BoundingBox;
  type: "photo" | "logo" | "icon" | "background";
  aspectRatio: number;
}

// ---------------------------------------------------------------------------
// LayoutAnalyzer
// ---------------------------------------------------------------------------

export class LayoutAnalyzer {
  private readonly vision: VisionAgent;

  constructor(vision: VisionAgent) {
    this.vision = vision;
  }

  /**
   * Analyze the visual hierarchy of a page screenshot.
   */
  async analyzeHierarchy(screenshot: string): Promise<LayoutHierarchy> {
    console.info("[LayoutAnalyzer] analyzeHierarchy");

    const layout = await this.vision.analyzeLayout(screenshot);

    // Map the flat LayoutStructure into a LayoutHierarchy
    const structure: HierarchyNode[] = layout.textBlocks.map((block) => ({
      level: block.level,
      content: block.content,
      bbox: block.bbox,
    }));

    return {
      levels: layout.hierarchy,
      structure,
    };
  }

  /**
   * Detect the grid structure of a page layout.
   */
  async detectGrid(screenshot: string): Promise<GridStructure> {
    console.info("[LayoutAnalyzer] detectGrid");

    const layout = await this.vision.analyzeLayout(screenshot);

    // Provide reasonable defaults when the LLM only returns row/column counts.
    return {
      rows: layout.gridStructure.rows,
      columns: layout.gridStructure.columns,
      cellSize: { width: 0, height: 0 },
      gaps: { horizontal: 0, vertical: 0 },
    };
  }

  /**
   * Detect distinct text layers in the screenshot.
   */
  async findTextLayers(screenshot: string): Promise<TextLayer[]> {
    console.info("[LayoutAnalyzer] findTextLayers");

    const layout = await this.vision.analyzeLayout(screenshot);

    return layout.textBlocks.map((block) => ({
      content: block.content,
      bbox: block.bbox,
      level: this.inferTextLevel(block.level),
      style: {
        fontSize: 0,
        fontFamily: "",
        color: "",
        alignment: "left" as const,
      },
    }));
  }

  /**
   * Detect image placeholder areas in the screenshot.
   */
  async findImagePlaceholders(
    screenshot: string,
  ): Promise<ImagePlaceholder[]> {
    console.info("[LayoutAnalyzer] findImagePlaceholders");

    const layout = await this.vision.analyzeLayout(screenshot);

    return layout.imagePlaceholders.map((ph) => ({
      bbox: ph.bbox,
      type: this.inferImageType(ph.type),
      aspectRatio:
        ph.bbox.height > 0 ? ph.bbox.width / ph.bbox.height : 1,
    }));
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private static readonly TEXT_LEVEL_MAP: Record<string, "h1" | "h2" | "h3" | "body" | "caption"> = {
    h1: "h1", "heading 1": "h1", title: "h1",
    h2: "h2", "heading 2": "h2", subtitle: "h2",
    h3: "h3", "heading 3": "h3",
    caption: "caption", small: "caption",
  };

  private static readonly IMAGE_TYPE_MAP: Record<string, "photo" | "logo" | "icon" | "background"> = {
    logo: "logo",
    icon: "icon",
    background: "background",
    bg: "background",
  };

  /** Coerce a free-text level string to a known TextLayer level. */
  private inferTextLevel(
    level: string,
  ): "h1" | "h2" | "h3" | "body" | "caption" {
    const lower = level.toLowerCase();
    for (const [key, value] of Object.entries(LayoutAnalyzer.TEXT_LEVEL_MAP)) {
      if (lower.includes(key)) return value;
    }
    return "body";
  }

  /** Coerce a free-text image type to a known ImagePlaceholder type. */
  private inferImageType(
    type: string,
  ): "photo" | "logo" | "icon" | "background" {
    const lower = type.toLowerCase();
    for (const [key, value] of Object.entries(LayoutAnalyzer.IMAGE_TYPE_MAP)) {
      if (lower.includes(key)) return value;
    }
    return "photo";
  }
}
