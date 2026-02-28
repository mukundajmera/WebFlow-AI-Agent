/**
 * CSVParser — Parse and validate CSV files for bulk automation.
 *
 * Handles delimiter detection, encoding, structure validation, and
 * converts raw CSV data into the internal {@link DataRow} format.
 */

import type { DataRow, ValidationResult } from "~types/data";

/** Maximum file size (bytes) before a performance warning is issued. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Common delimiters ordered by popularity. */
const DELIMITERS = [",", ";", "\t", "|"] as const;

/**
 * Internal row wrapper that augments each {@link DataRow} with metadata.
 */
export interface IndexedDataRow {
  id: string;
  data: DataRow;
  status: "pending" | "processing" | "done" | "error";
}

/**
 * CSVParser provides methods for parsing, validating, and previewing CSV data.
 */
export class CSVParser {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Parse a {@link File} object into an array of {@link DataRow}.
   *
   * @throws If the file is empty, exceeds size limits, or is malformed.
   */
  async parse(file: File): Promise<DataRow[]> {
    if (file.size === 0) {
      throw new Error("CSV file is empty");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      // eslint-disable-next-line no-console
      console.warn(
        `CSV file is ${(file.size / 1024 / 1024).toFixed(1)} MB — performance may be affected`
      );
    }

    const text = await file.text();
    return this.parseFromText(text);
  }

  /**
   * Parse CSV content supplied as a plain string.
   */
  parseFromText(csvText: string): DataRow[] {
    const trimmed = csvText.trim();
    if (trimmed.length === 0) {
      throw new Error("CSV text is empty");
    }

    const delimiter = this.detectDelimiter(trimmed);
    const lines = this.splitLines(trimmed);

    if (lines.length < 2) {
      throw new Error("CSV must contain a header row and at least one data row");
    }

    const headers = this.parseLine(lines[0], delimiter).map((h) => h.trim());
    const rows: DataRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue; // skip blank lines

      const values = this.parseLine(line, delimiter);
      const row: DataRow = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() ?? "";
      });

      rows.push(row);
    }

    if (rows.length === 0) {
      throw new Error("CSV must contain at least one data row");
    }

    return rows;
  }

  /**
   * Auto-detect the delimiter used in a CSV sample.
   *
   * Counts occurrences of common delimiters across the first few lines and
   * returns the one that appears most consistently.
   */
  detectDelimiter(sample: string): string {
    const sampleLines = this.splitLines(sample).slice(0, 5);

    let bestDelimiter: string = ",";
    let bestScore = -1;

    for (const delimiter of DELIMITERS) {
      const counts = sampleLines.map((line) => this.countOccurrences(line, delimiter));

      // All sampled lines must contain the delimiter at least once
      if (counts.some((c) => c === 0)) continue;

      // Consistency: every line should have the same count
      const allEqual = counts.every((c) => c === counts[0]);
      const score = allEqual ? counts[0] * sampleLines.length : 0;

      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Validate the structure of parsed rows.
   *
   * Optionally checks that a set of expected columns exist.
   */
  validateStructure(rows: DataRow[], expectedColumns?: string[]): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    if (rows.length === 0) {
      errors.push({ message: "No data rows found" });
      return { valid: false, errors, warnings };
    }

    // Check that all rows have the same set of columns
    const referenceKeys = Object.keys(rows[0]).sort().join(",");
    rows.forEach((row, idx) => {
      const keys = Object.keys(row).sort().join(",");
      if (keys !== referenceKeys) {
        errors.push({
          message: `Row ${idx + 1} has inconsistent columns`,
          row: idx + 1,
        });
      }
    });

    // Check for completely empty rows
    rows.forEach((row, idx) => {
      const allEmpty = Object.values(row).every((v) => String(v).trim() === "");
      if (allEmpty) {
        warnings.push({
          message: `Row ${idx + 1} is empty`,
          row: idx + 1,
          suggestion: "Consider removing empty rows",
        });
      }
    });

    // Check expected columns
    if (expectedColumns) {
      const actualColumns = Object.keys(rows[0]);
      for (const col of expectedColumns) {
        if (!actualColumns.includes(col)) {
          errors.push({
            field: col,
            message: `Expected column "${col}" not found`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Return a preview of the first *rowCount* rows from a file.
   */
  async preview(file: File, rowCount = 5): Promise<DataRow[]> {
    const rows = await this.parse(file);
    return rows.slice(0, rowCount);
  }

  /**
   * Detect the character encoding of a file.
   *
   * Reads the first 1 KB and checks for a UTF-8 BOM. Falls back to
   * `"utf-8"` by default.
   */
  async detectEncoding(file: File): Promise<string> {
    const slice = file.slice(0, 1024);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // UTF-8 BOM
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return "utf-8-bom";
    }

    // UTF-16 LE BOM
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return "utf-16le";
    }

    // UTF-16 BE BOM
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return "utf-16be";
    }

    return "utf-8";
  }

  /**
   * Convert parsed row objects into the internal {@link IndexedDataRow} format
   * with `id` and `status` metadata.
   */
  convertToDataRows(parsed: DataRow[]): IndexedDataRow[] {
    return parsed.map((row, index) => ({
      id: `row_${index}`,
      data: row,
      status: "pending" as const,
    }));
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Split text into lines, handling `\r\n` and `\r`. */
  private splitLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/).filter((_, idx, arr) => {
      // Keep all lines except a trailing empty one
      if (idx === arr.length - 1 && arr[idx].trim() === "") return false;
      return true;
    });
  }

  /** Parse a single CSV line respecting quoted fields. */
  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (inQuotes) {
        if (ch === '"') {
          // Escaped quote
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }

    result.push(current);
    return result;
  }

  /** Count non-overlapping occurrences of `char` in `text`. */
  private countOccurrences(text: string, char: string): number {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === char) count++;
    }
    return count;
  }
}
