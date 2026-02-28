import { describe, it, expect } from "vitest";
import {
  convertPercentageToPx,
  convertPxToPercentage,
  getCenterPoint,
  findClosestElement,
  filterByType,
  sortByConfidence,
  groupByProximity,
} from "~core/vision/ElementDetector";
import type { DetectedElement } from "~types/vision";

function makeElement(
  overrides: Partial<DetectedElement> & { bbox: DetectedElement["bbox"] },
): DetectedElement {
  return {
    type: "button",
    confidence: 0.9,
    label: "Test",
    ...overrides,
  };
}

describe("ElementDetector utilities", () => {
  // ── convertPercentageToPx ───────────────────────────────────────

  describe("convertPercentageToPx", () => {
    it("converts percentage coordinates to pixels", () => {
      const result = convertPercentageToPx(
        { x: 50, y: 25, width: 10, height: 20 },
        1920,
        1080,
      );
      expect(result).toEqual({ x: 960, y: 270, width: 192, height: 216 });
    });

    it("returns zeros for zero-percent bbox", () => {
      const result = convertPercentageToPx(
        { x: 0, y: 0, width: 0, height: 0 },
        1920,
        1080,
      );
      expect(result).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  // ── convertPxToPercentage ───────────────────────────────────────

  describe("convertPxToPercentage", () => {
    it("converts pixel coordinates to percentages", () => {
      const result = convertPxToPercentage(
        { x: 960, y: 270, width: 192, height: 216 },
        1920,
        1080,
      );
      expect(result).toEqual({ x: 50, y: 25, width: 10, height: 20 });
    });

    it("is the inverse of convertPercentageToPx", () => {
      const original = { x: 30, y: 40, width: 15, height: 25 };
      const px = convertPercentageToPx(original, 1000, 800);
      const back = convertPxToPercentage(px, 1000, 800);
      expect(back.x).toBeCloseTo(original.x);
      expect(back.y).toBeCloseTo(original.y);
      expect(back.width).toBeCloseTo(original.width);
      expect(back.height).toBeCloseTo(original.height);
    });
  });

  // ── getCenterPoint ────────────────────────────────────────────────

  describe("getCenterPoint", () => {
    it("calculates center of a bounding box", () => {
      const center = getCenterPoint({ x: 100, y: 200, width: 50, height: 30 });
      expect(center).toEqual({ x: 125, y: 215 });
    });

    it("returns top-left when width and height are zero", () => {
      const center = getCenterPoint({ x: 10, y: 20, width: 0, height: 0 });
      expect(center).toEqual({ x: 10, y: 20 });
    });
  });

  // ── findClosestElement ────────────────────────────────────────────

  describe("findClosestElement", () => {
    it("returns null for empty array", () => {
      expect(findClosestElement({ x: 50, y: 50 }, [])).toBeNull();
    });

    it("finds the nearest element to a click point", () => {
      const elements: DetectedElement[] = [
        makeElement({ bbox: { x: 0, y: 0, width: 20, height: 20 }, label: "Far" }),
        makeElement({ bbox: { x: 40, y: 40, width: 20, height: 20 }, label: "Near" }),
      ];

      const closest = findClosestElement({ x: 50, y: 50 }, elements);
      expect(closest?.label).toBe("Near");
    });

    it("returns the only element when array has one item", () => {
      const el = makeElement({ bbox: { x: 100, y: 100, width: 10, height: 10 } });
      expect(findClosestElement({ x: 0, y: 0 }, [el])).toBe(el);
    });
  });

  // ── filterByType ──────────────────────────────────────────────────

  describe("filterByType", () => {
    it("filters elements by type", () => {
      const elements: DetectedElement[] = [
        makeElement({ type: "button", bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ type: "input", bbox: { x: 20, y: 0, width: 10, height: 10 } }),
        makeElement({ type: "button", bbox: { x: 40, y: 0, width: 10, height: 10 } }),
      ];

      const buttons = filterByType(elements, "button");
      expect(buttons).toHaveLength(2);
      expect(buttons.every((e) => e.type === "button")).toBe(true);
    });

    it("returns empty array when no match", () => {
      const elements: DetectedElement[] = [
        makeElement({ type: "button", bbox: { x: 0, y: 0, width: 10, height: 10 } }),
      ];
      expect(filterByType(elements, "image")).toHaveLength(0);
    });
  });

  // ── sortByConfidence ──────────────────────────────────────────────

  describe("sortByConfidence", () => {
    it("sorts descending by confidence", () => {
      const elements: DetectedElement[] = [
        makeElement({ confidence: 0.3, bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ confidence: 0.9, bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ confidence: 0.6, bbox: { x: 0, y: 0, width: 10, height: 10 } }),
      ];

      const sorted = sortByConfidence(elements);
      expect(sorted[0].confidence).toBe(0.9);
      expect(sorted[1].confidence).toBe(0.6);
      expect(sorted[2].confidence).toBe(0.3);
    });

    it("does not mutate the original array", () => {
      const elements: DetectedElement[] = [
        makeElement({ confidence: 0.1, bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ confidence: 0.9, bbox: { x: 0, y: 0, width: 10, height: 10 } }),
      ];

      const sorted = sortByConfidence(elements);
      expect(elements[0].confidence).toBe(0.1);
      expect(sorted[0].confidence).toBe(0.9);
    });
  });

  // ── groupByProximity ──────────────────────────────────────────────

  describe("groupByProximity", () => {
    it("returns empty array for empty input", () => {
      expect(groupByProximity([], 50)).toEqual([]);
    });

    it("groups nearby elements together", () => {
      const elements: DetectedElement[] = [
        makeElement({ label: "A", bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ label: "B", bbox: { x: 5, y: 5, width: 10, height: 10 } }),
        makeElement({ label: "C", bbox: { x: 500, y: 500, width: 10, height: 10 } }),
      ];

      const groups = groupByProximity(elements, 50);
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2);
      expect(groups[1]).toHaveLength(1);
    });

    it("puts all elements in one group when threshold is very large", () => {
      const elements: DetectedElement[] = [
        makeElement({ bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ bbox: { x: 1000, y: 1000, width: 10, height: 10 } }),
      ];

      const groups = groupByProximity(elements, 99999);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(2);
    });

    it("puts each element in its own group when threshold is zero", () => {
      const elements: DetectedElement[] = [
        makeElement({ bbox: { x: 0, y: 0, width: 10, height: 10 } }),
        makeElement({ bbox: { x: 100, y: 100, width: 10, height: 10 } }),
      ];

      const groups = groupByProximity(elements, 0);
      expect(groups).toHaveLength(2);
    });
  });
});
