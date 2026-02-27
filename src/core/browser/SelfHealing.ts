/**
 * Self-healing selector logic.
 * When a CSS selector breaks (e.g. after a UI update), this module attempts
 * to locate the intended element through a series of fallback strategies.
 */

import type { DOMState, VisibleElement } from "~types/browser";
import type { BrowserAgent } from "./BrowserAgent";

/** Report produced by {@link SelfHealing.detectUIChange}. */
export interface UIChangeReport {
  changed: boolean;
  suggestedSelector?: string;
  /** Confidence that the suggested selector targets the same element (0-1). */
  confidence: number;
  description: string;
}

/**
 * Adaptive element location when selectors break.
 *
 * Healing strategies (in priority order):
 * 1. **Attribute Fallback** – data-testid, aria-label, name, role
 * 2. **Structural Navigation** – parent→child path
 * 3. **Text Content Matching** – visible text similarity
 * 4. **Tag + partial class matching** – fuzzy class comparison
 */
export class SelfHealing {
  private readonly agent: BrowserAgent;

  constructor(agent: BrowserAgent) {
    this.agent = agent;
  }

  /**
   * Attempt to find a working alternative for a broken selector.
   *
   * @param failedSelector - The CSS selector that stopped matching.
   * @param domState - Current DOM snapshot.
   * @returns A replacement selector, or `null` if healing fails.
   */
  async healSelector(
    failedSelector: string,
    domState: DOMState,
  ): Promise<string | null> {
    console.info("[SelfHealing] Attempting to heal selector:", failedSelector);

    // Parse hints from the failed selector
    const hints = this.extractSelectorHints(failedSelector);
    const elements = domState.visibleElements;

    // Strategy 1 – Attribute fallback
    const attrMatch = this.findByAttributes(elements, hints);
    if (attrMatch) {
      console.info("[SelfHealing] Healed via attribute fallback:", attrMatch);
      return attrMatch;
    }

    // Strategy 2 – Structural navigation
    const structMatch = this.findByStructure(elements, hints);
    if (structMatch) {
      console.info("[SelfHealing] Healed via structural navigation:", structMatch);
      return structMatch;
    }

    // Strategy 3 – Text content matching
    const textMatch = this.findByTextContent(elements, hints);
    if (textMatch) {
      console.info("[SelfHealing] Healed via text content:", textMatch);
      return textMatch;
    }

    // Strategy 4 – Tag + partial class
    const classMatch = this.findByPartialClass(elements, hints);
    if (classMatch) {
      console.info("[SelfHealing] Healed via partial class match:", classMatch);
      return classMatch;
    }

    console.info("[SelfHealing] All healing strategies exhausted");
    return null;
  }

  /**
   * Check whether the UI has changed such that the expected selector
   * no longer resolves, and suggest an alternative if possible.
   *
   * @param expectedSelector - The selector we expect to find.
   */
  async detectUIChange(expectedSelector: string): Promise<UIChangeReport> {
    try {
      const visible = await this.agent.isElementVisible(expectedSelector);
      if (visible) {
        return {
          changed: false,
          confidence: 1,
          description: "Element is still present and visible",
        };
      }

      // Element is gone – try to heal
      const domState = await this.agent.getDOMState();
      const healed = await this.healSelector(expectedSelector, domState);

      if (healed) {
        return {
          changed: true,
          suggestedSelector: healed,
          confidence: 0.7,
          description: `Original selector "${expectedSelector}" not found; suggested alternative: "${healed}"`,
        };
      }

      return {
        changed: true,
        confidence: 0,
        description: `Element "${expectedSelector}" not found and could not be healed`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        changed: true,
        confidence: 0,
        description: `Error detecting UI change: ${message}`,
      };
    }
  }

  /**
   * Fuzzy-find a DOM element similar to the one previously addressed by
   * {@link brokenSelector}.
   *
   * @param brokenSelector - The selector that no longer works.
   * @param domState - Current DOM snapshot.
   * @returns A replacement selector, or `null`.
   */
  findSimilarElement(
    brokenSelector: string,
    domState: DOMState,
  ): string | null {
    const hints = this.extractSelectorHints(brokenSelector);
    const elements = domState.visibleElements;

    // Score each visible element against the hints
    let bestScore = 0;
    let bestSelector: string | null = null;

    for (const el of elements) {
      let score = 0;

      if (hints.tagName && el.tagName.toLowerCase() === hints.tagName) score += 2;
      if (hints.id && el.attributes["id"] === hints.id) score += 5;
      if (hints.classes.length > 0) {
        const elClasses = (el.attributes["class"] ?? "").split(/\s+/);
        for (const cls of hints.classes) {
          if (elClasses.includes(cls)) score += 1;
        }
      }
      if (hints.text && el.text.toLowerCase().includes(hints.text.toLowerCase())) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSelector = el.selector;
      }
    }

    return bestScore >= 2 ? bestSelector : null;
  }

  // ─── Private helpers ─────────────────────────────────────────────

  /** Hints extracted from a CSS selector for fuzzy matching. */
  private extractSelectorHints(selector: string): SelectorHints {
    const hints: SelectorHints = { classes: [] };

    // ID
    const idMatch = selector.match(/#([\w-]+)/);
    if (idMatch) hints.id = idMatch[1];

    // Classes
    const classMatches = selector.match(/\.([\w-]+)/g);
    if (classMatches) {
      hints.classes = classMatches.map((c) => c.slice(1));
    }

    // Tag name (leading word before any qualifier)
    const tagMatch = selector.match(/^(\w+)/);
    if (tagMatch) hints.tagName = tagMatch[1].toLowerCase();

    // Attribute values
    const attrMatch = selector.match(/\[(\w[\w-]*)=['"](.*?)['"]\]/g);
    if (attrMatch) {
      hints.attributes = {};
      for (const m of attrMatch) {
        const parts = m.match(/\[(\w[\w-]*)=['"](.*?)['"]\]/);
        if (parts) hints.attributes[parts[1]] = parts[2];
      }
    }

    return hints;
  }

  /** Strategy 1: match by data-testid, aria-label, name, or role. */
  private findByAttributes(
    elements: VisibleElement[],
    hints: SelectorHints,
  ): string | null {
    const attrKeys = ["data-testid", "aria-label", "name", "role"] as const;

    for (const el of elements) {
      // If hints have attribute info, match against it
      if (hints.attributes) {
        for (const key of attrKeys) {
          if (hints.attributes[key] && el.attributes[key] === hints.attributes[key]) {
            return el.selector;
          }
        }
      }

      // If hints have an id, look for matching data-testid or name
      if (hints.id) {
        if (
          el.attributes["data-testid"] === hints.id ||
          el.attributes["name"] === hints.id
        ) {
          return el.selector;
        }
      }
    }

    return null;
  }

  /** Strategy 2: structural parent→child path match. */
  private findByStructure(
    elements: VisibleElement[],
    hints: SelectorHints,
  ): string | null {
    if (!hints.tagName) return null;

    for (const el of elements) {
      if (el.tagName.toLowerCase() !== hints.tagName) continue;

      // Match by a combination of tag + at least one class
      if (hints.classes.length > 0) {
        const elClasses = (el.attributes["class"] ?? "").split(/\s+/);
        const matchCount = hints.classes.filter((c) =>
          elClasses.includes(c),
        ).length;
        if (matchCount >= 1) {
          return el.selector;
        }
      }
    }

    return null;
  }

  /** Strategy 3: text content matching. */
  private findByTextContent(
    elements: VisibleElement[],
    hints: SelectorHints,
  ): string | null {
    if (!hints.text) {
      // Derive text hint from id or class names
      const candidate =
        hints.id ??
        hints.classes.join(" ").replace(/[-_]/g, " ");
      if (!candidate) return null;

      for (const el of elements) {
        if (
          el.text &&
          el.text.toLowerCase().includes(candidate.toLowerCase())
        ) {
          return el.selector;
        }
      }
      return null;
    }

    for (const el of elements) {
      if (
        el.text &&
        el.text.toLowerCase().includes(hints.text.toLowerCase())
      ) {
        return el.selector;
      }
    }

    return null;
  }

  /** Strategy 4: tag + partial class comparison. */
  private findByPartialClass(
    elements: VisibleElement[],
    hints: SelectorHints,
  ): string | null {
    if (!hints.tagName || hints.classes.length === 0) return null;

    for (const el of elements) {
      if (el.tagName.toLowerCase() !== hints.tagName) continue;

      const elClasses = (el.attributes["class"] ?? "").split(/\s+/);
      for (const hintClass of hints.classes) {
        // Partial match – the element's class starts with or contains the hint
        if (elClasses.some((c) => c.includes(hintClass) || hintClass.includes(c))) {
          return el.selector;
        }
      }
    }

    return null;
  }
}

/** Internal helper type for parsed selector hints. */
interface SelectorHints {
  tagName?: string;
  id?: string;
  classes: string[];
  text?: string;
  attributes?: Record<string, string>;
}
