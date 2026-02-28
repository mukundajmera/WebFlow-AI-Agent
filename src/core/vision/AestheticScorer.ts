/**
 * AestheticScorer — Uses a VisionAgent to evaluate the visual quality of
 * web page designs against stylistic criteria.
 */

import type { AestheticScore } from "~types/vision";
import type { VisionAgent } from "./VisionAgent";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Criteria used to evaluate a design. */
export interface StyleCriteria {
  style?: string;
  colors?: string[];
  typography?: string;
  layout?: string;
}

/** A template ranked against others based on aesthetic score. */
export interface RankedTemplate {
  screenshot: string;
  score: AestheticScore;
  rank: number;
}

// ---------------------------------------------------------------------------
// AestheticScorer
// ---------------------------------------------------------------------------

export class AestheticScorer {
  private readonly vision: VisionAgent;

  constructor(vision: VisionAgent) {
    this.vision = vision;
  }

  /**
   * Produce a comprehensive aesthetic score for a screenshot based on the
   * supplied style criteria.
   */
  async scoreTemplate(
    screenshot: string,
    criteria: StyleCriteria,
  ): Promise<AestheticScore> {
    console.info("[AestheticScorer] scoreTemplate");

    const parts: string[] = [];
    if (criteria.style) parts.push(`Style: ${criteria.style}`);
    if (criteria.colors) parts.push(`Colors: ${criteria.colors.join(", ")}`);
    if (criteria.typography) parts.push(`Typography: ${criteria.typography}`);
    if (criteria.layout) parts.push(`Layout: ${criteria.layout}`);

    const description = parts.length > 0 ? parts.join(". ") : "general quality";

    const overallScore = await this.vision.scoreTemplateMatch(
      screenshot,
      description,
    );

    // Derive sub-scores by querying individual aspects
    const [typography, colorPalette, layout] = await Promise.all([
      this.scoreTypography(screenshot, criteria.typography ?? "modern clean typography"),
      this.scoreColorPalette(screenshot, criteria.colors),
      this.scoreLayout(screenshot),
    ]);

    return {
      score: overallScore,
      reasoning: `Overall: ${overallScore}/100 — Typography: ${typography}, Color: ${colorPalette}, Layout: ${layout}`,
      criteria: {
        typography,
        colorPalette,
        layout,
        whitespace: layout, // approximate whitespace from layout score
        overall: overallScore,
      },
    };
  }

  /**
   * Score the typography quality of a screenshot (0-100).
   */
  async scoreTypography(
    screenshot: string,
    desiredStyle: string,
  ): Promise<number> {
    console.info("[AestheticScorer] scoreTypography");
    return this.vision.scoreTemplateMatch(
      screenshot,
      `Typography evaluation — desired: ${desiredStyle}`,
    );
  }

  /**
   * Score the color palette of a screenshot (0-100).
   */
  async scoreColorPalette(
    screenshot: string,
    desiredColors?: string[],
  ): Promise<number> {
    console.info("[AestheticScorer] scoreColorPalette");
    const colorNote = desiredColors
      ? `Desired colors: ${desiredColors.join(", ")}`
      : "harmonious color palette";

    return this.vision.scoreTemplateMatch(
      screenshot,
      `Color palette evaluation — ${colorNote}`,
    );
  }

  /**
   * Score the layout / spatial organization of a screenshot (0-100).
   */
  async scoreLayout(screenshot: string): Promise<number> {
    console.info("[AestheticScorer] scoreLayout");
    return this.vision.scoreTemplateMatch(
      screenshot,
      "Layout and whitespace evaluation — balanced, well-structured",
    );
  }

  /**
   * Compare multiple template screenshots and return them ranked by score.
   */
  async compareTemplates(
    screenshots: string[],
    criteria: StyleCriteria,
  ): Promise<RankedTemplate[]> {
    console.info(
      "[AestheticScorer] compareTemplates –",
      screenshots.length,
      "templates",
    );

    const scored = await Promise.all(
      screenshots.map(async (screenshot) => ({
        screenshot,
        score: await this.scoreTemplate(screenshot, criteria),
      })),
    );

    // Sort descending by overall score
    scored.sort((a, b) => b.score.score - a.score.score);

    return scored.map((entry, idx) => ({
      screenshot: entry.screenshot,
      score: entry.score,
      rank: idx + 1,
    }));
  }
}
