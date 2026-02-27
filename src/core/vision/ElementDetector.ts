/**
 * ElementDetector — Standalone utility functions for working with
 * detected UI elements (coordinate conversion, filtering, grouping).
 */

import type { BoundingBox, Coordinates } from "~types/common";
import type { DetectedElement, ElementType } from "~types/vision";

// ---------------------------------------------------------------------------
// Coordinate conversion
// ---------------------------------------------------------------------------

/**
 * Convert a bounding box from percentage-based coordinates to pixels.
 */
export function convertPercentageToPx(
  bbox: BoundingBox,
  screenWidth: number,
  screenHeight: number,
): BoundingBox {
  return {
    x: (bbox.x / 100) * screenWidth,
    y: (bbox.y / 100) * screenHeight,
    width: (bbox.width / 100) * screenWidth,
    height: (bbox.height / 100) * screenHeight,
  };
}

/**
 * Convert a bounding box from pixel coordinates to percentages.
 */
export function convertPxToPercentage(
  bbox: BoundingBox,
  screenWidth: number,
  screenHeight: number,
): BoundingBox {
  return {
    x: (bbox.x / screenWidth) * 100,
    y: (bbox.y / screenHeight) * 100,
    width: (bbox.width / screenWidth) * 100,
    height: (bbox.height / screenHeight) * 100,
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Return the center point of a bounding box.
 */
export function getCenterPoint(bbox: BoundingBox): Coordinates {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}

/**
 * Find the detected element whose center is closest to `clickPoint`.
 * Returns `null` when the elements array is empty.
 */
export function findClosestElement(
  clickPoint: Coordinates,
  elements: DetectedElement[],
): DetectedElement | null {
  if (elements.length === 0) return null;

  let closest: DetectedElement = elements[0];
  let minDist = Infinity;

  for (const el of elements) {
    const center = getCenterPoint(el.bbox);
    const dist = Math.hypot(center.x - clickPoint.x, center.y - clickPoint.y);
    if (dist < minDist) {
      minDist = dist;
      closest = el;
    }
  }

  return closest;
}

// ---------------------------------------------------------------------------
// Filtering & sorting
// ---------------------------------------------------------------------------

/**
 * Filter elements to only those matching a specific `ElementType`.
 */
export function filterByType(
  elements: DetectedElement[],
  type: ElementType,
): DetectedElement[] {
  return elements.filter((el) => el.type === type);
}

/**
 * Return a copy of the elements array sorted by confidence (descending).
 */
export function sortByConfidence(
  elements: DetectedElement[],
): DetectedElement[] {
  return [...elements].sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group elements by spatial proximity. Two elements belong to the same group
 * when the distance between their center points is less than `threshold` px.
 *
 * Uses a simple single-pass clustering approach.
 */
export function groupByProximity(
  elements: DetectedElement[],
  threshold: number,
): DetectedElement[][] {
  if (elements.length === 0) return [];

  const assigned = new Set<number>();
  const groups: DetectedElement[][] = [];

  for (let i = 0; i < elements.length; i++) {
    if (assigned.has(i)) continue;

    const group: DetectedElement[] = [elements[i]];
    assigned.add(i);
    const centerA = getCenterPoint(elements[i].bbox);

    for (let j = i + 1; j < elements.length; j++) {
      if (assigned.has(j)) continue;

      const centerB = getCenterPoint(elements[j].bbox);
      const dist = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);

      if (dist < threshold) {
        group.push(elements[j]);
        assigned.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}
