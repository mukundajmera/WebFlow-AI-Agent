/**
 * DataMapper — Map data columns to design fields intelligently.
 *
 * Provides auto-suggestion of column-to-field mappings, value
 * transformations, and column type detection.
 */

import type { DataRow } from "~types/data";

/**
 * A mapping from design field names to data column names.
 */
export type ColumnMapping = Record<string, string>;

/**
 * Data that has been mapped from a source row to design fields.
 */
export type MappedData = Record<string, string | number>;

/**
 * Supported transformation identifiers.
 */
export type TransformationType =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "truncate"
  | "dateFormat"
  | "urlEncode";

/**
 * Transformation descriptor applied to a field value.
 */
export interface Transformation {
  type: TransformationType;
  /** Maximum length for the `truncate` transformation. */
  maxLength?: number;
  /** Date format string for the `dateFormat` transformation. */
  dateFormat?: string;
}

/**
 * Detected data type for a column.
 */
export type FieldType = "text" | "number" | "url" | "date";

/**
 * Mapping from column name to detected type.
 */
export type FieldTypes = Record<string, FieldType>;

/**
 * DataMapper intelligently maps columns from a data source to the target
 * design fields.
 */
export class DataMapper {
  // -----------------------------------------------------------------------
  // Mapping
  // -----------------------------------------------------------------------

  /**
   * Auto-suggest a column → field mapping.
   *
   * Uses case-insensitive exact match, contains match, and simple fuzzy
   * similarity to find the best match for each design field.
   */
  suggestMapping(columns: string[], designFields: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const usedColumns = new Set<string>();

    for (const field of designFields) {
      const best = this.findBestMatch(field, columns, usedColumns);
      if (best) {
        mapping[field] = best;
        usedColumns.add(best);
      }
    }

    return mapping;
  }

  /**
   * Apply a mapping to a single data row, returning only the mapped fields.
   */
  applyMapping(dataRow: DataRow, mapping: ColumnMapping): MappedData {
    const mapped: MappedData = {};
    for (const [field, column] of Object.entries(mapping)) {
      mapped[field] = dataRow[column] ?? "";
    }
    return mapped;
  }

  /**
   * Check that every required field is present in the mapping.
   */
  validateMapping(mapping: ColumnMapping, requiredFields: string[]): boolean {
    return requiredFields.every((field) => field in mapping && mapping[field] !== "");
  }

  // -----------------------------------------------------------------------
  // Transformations
  // -----------------------------------------------------------------------

  /**
   * Apply a transformation to a string value.
   */
  transformValue(value: string, transformation: Transformation): string {
    switch (transformation.type) {
      case "uppercase":
        return value.toUpperCase();
      case "lowercase":
        return value.toLowerCase();
      case "trim":
        return value.trim();
      case "truncate":
        return value.substring(0, transformation.maxLength ?? value.length);
      case "dateFormat":
        return this.formatDate(value);
      case "urlEncode":
        return encodeURIComponent(value);
      default:
        return value;
    }
  }

  // -----------------------------------------------------------------------
  // Type Detection
  // -----------------------------------------------------------------------

  /**
   * Detect the data types of columns by sampling the first rows.
   */
  detectFieldTypes(rows: DataRow[]): FieldTypes {
    if (rows.length === 0) return {};

    const sample = rows.slice(0, 10);
    const columns = Object.keys(rows[0]);
    const types: FieldTypes = {};

    for (const col of columns) {
      types[col] = this.inferType(sample, col);
    }

    return types;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Find the best matching column for a design field.
   */
  private findBestMatch(field: string, columns: string[], usedColumns: Set<string>): string | null {
    const fieldLower = field.toLowerCase();
    const available = columns.filter((c) => !usedColumns.has(c));

    // 1. Exact case-insensitive match
    const exact = available.find((c) => c.toLowerCase() === fieldLower);
    if (exact) return exact;

    // 2. Contains match (column contains field or field contains column)
    const contains = available.find((c) => {
      const cLower = c.toLowerCase();
      return cLower.includes(fieldLower) || fieldLower.includes(cLower);
    });
    if (contains) return contains;

    // 3. Simple token overlap similarity
    let bestCol: string | null = null;
    let bestSimilarity = 0;

    for (const col of available) {
      const sim = this.tokenSimilarity(fieldLower, col.toLowerCase());
      if (sim > bestSimilarity && sim >= 0.3) {
        bestSimilarity = sim;
        bestCol = col;
      }
    }

    return bestCol;
  }

  /**
   * Jaccard-like similarity based on character tri-grams.
   */
  private tokenSimilarity(a: string, b: string): number {
    const trigramsA = this.trigrams(a);
    const trigramsB = this.trigrams(b);

    if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
    if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

    let intersection = 0;
    for (const t of trigramsA) {
      if (trigramsB.has(t)) intersection++;
    }

    const union = trigramsA.size + trigramsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private trigrams(str: string): Set<string> {
    const set = new Set<string>();
    for (let i = 0; i <= str.length - 3; i++) {
      set.add(str.substring(i, i + 3));
    }
    return set;
  }

  /**
   * Infer the data type of a column from sample rows.
   */
  private inferType(rows: DataRow[], column: string): FieldType {
    const values = rows.map((r) => String(r[column] ?? "")).filter((v) => v.length > 0);
    if (values.length === 0) return "text";

    if (values.every((v) => !isNaN(Number(v)))) return "number";
    if (values.every((v) => /^https?:\/\/.+/i.test(v))) return "url";
    if (values.every((v) => !isNaN(Date.parse(v)) && /\d/.test(v))) return "date";

    return "text";
  }

  /**
   * Basic date formatting helper.
   */
  private formatDate(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  }
}
