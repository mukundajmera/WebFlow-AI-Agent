/**
 * AdapterRegistry — Manages website adapters and selects the best match
 * for a given URL.
 *
 * On construction the registry pre-registers the built-in CanvaAdapter,
 * FigmaAdapter, and GenericWebAdapter (as the default fallback).
 */

import type { BaseAdapter } from "~types/adapter";
import { CanvaAdapter } from "./CanvaAdapter";
import { FigmaAdapter } from "./FigmaAdapter";
import { GenericWebAdapter } from "./GenericWebAdapter";

/**
 * Registry that holds all available adapters and resolves the most specific
 * one for a given URL.
 */
export class AdapterRegistry {
  /** Registered adapters, sorted by specificity (most specific first). */
  private adapters: BaseAdapter[] = [];

  /** Fallback adapter used when no specific adapter matches. */
  private defaultAdapter: BaseAdapter;

  constructor() {
    this.defaultAdapter = new GenericWebAdapter();
    this.registerAdapter(new CanvaAdapter());
    this.registerAdapter(new FigmaAdapter());
  }

  /**
   * Register an adapter and re-sort the list so that adapters with fewer
   * (i.e. more specific) supported domains come first.
   */
  registerAdapter(adapter: BaseAdapter): void {
    this.adapters.push(adapter);
    this.adapters.sort(
      (a, b) => a.supportedDomains.length - b.supportedDomains.length,
    );
  }

  /**
   * Return the most appropriate adapter for the given URL.
   *
   * Iterates registered adapters and returns the first whose
   * `supportedDomains` includes the URL's hostname. Falls back to the
   * default (generic) adapter when no match is found.
   */
  getAdapter(url: string): BaseAdapter {
    const hostname = this.extractHostname(url);

    for (const adapter of this.adapters) {
      if (adapter.supportedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return adapter;
      }
    }

    return this.defaultAdapter;
  }

  /** Return a shallow copy of all registered (non-default) adapters. */
  getAllAdapters(): BaseAdapter[] {
    return [...this.adapters];
  }

  /**
   * Check whether a non-default (site-specific) adapter exists for the URL.
   */
  hasAdapterFor(url: string): boolean {
    const hostname = this.extractHostname(url);
    return this.adapters.some((adapter) =>
      adapter.supportedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`)),
    );
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Extract hostname from a URL string, handling edge cases. */
  private extractHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
}
