/**
 * AdapterFactory — Factory for creating adapter instances by name.
 *
 * Provides a simple string-based lookup so callers can instantiate adapters
 * without importing concrete classes directly.
 */

import type { BaseAdapter } from "~types/adapter";
import { CanvaAdapter } from "./CanvaAdapter";
import { FigmaAdapter } from "./FigmaAdapter";
import { GenericWebAdapter } from "./GenericWebAdapter";

/** All adapter names recognised by the factory. */
const AVAILABLE_ADAPTERS = ["canva", "figma", "generic"] as const;

/**
 * Create an adapter instance by name.
 *
 * @param name - One of `'canva'`, `'figma'`, or `'generic'`.
 * @returns A new `BaseAdapter` instance.
 * @throws If the name is not recognised.
 */
export function createAdapter(name: string): BaseAdapter {
  switch (name.toLowerCase()) {
    case "canva":
      return new CanvaAdapter();
    case "figma":
      return new FigmaAdapter();
    case "generic":
      return new GenericWebAdapter();
    default:
      throw new Error(`Unknown adapter: "${name}". Available: ${AVAILABLE_ADAPTERS.join(", ")}`);
  }
}

/**
 * Return the list of adapter names that the factory can create.
 */
export function getAvailableAdapters(): string[] {
  return [...AVAILABLE_ADAPTERS];
}
