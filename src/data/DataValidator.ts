/**
 * DataValidator — Validate data quality before processing.
 *
 * Supports pluggable validation rules (required fields, max length, URL,
 * email, regex pattern), data sanitisation, and duplicate detection.
 */

import type { DataRow } from "~types/data";

// ---------------------------------------------------------------------------
// Rule types
// ---------------------------------------------------------------------------

/** Base rule fields shared by every validation rule. */
interface BaseRule {
  type: string;
}

export interface RequiredFieldsRule extends BaseRule {
  type: "requiredFields";
  fields: string[];
}

export interface MaxLengthRule extends BaseRule {
  type: "maxLength";
  field: string;
  maxLength: number;
}

export interface ValidUrlRule extends BaseRule {
  type: "validUrl";
  field: string;
}

export interface ValidEmailRule extends BaseRule {
  type: "validEmail";
  field: string;
}

export interface PatternRule extends BaseRule {
  type: "pattern";
  field: string;
  pattern: RegExp;
}

/**
 * Union of all supported validation rule shapes.
 */
export type ValidationRule =
  | RequiredFieldsRule
  | MaxLengthRule
  | ValidUrlRule
  | ValidEmailRule
  | PatternRule;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface RowViolation {
  rowIndex: number;
  field: string;
  rule: string;
  message: string;
}

export interface ValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: RowViolation[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Simple URL pattern (protocol + host). */
const URL_RE = /^https?:\/\/.+/i;

/** RFC 5322–ish email pattern (intentionally kept simple). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * DataValidator runs rule-based checks on data rows, sanitises content,
 * and detects duplicates.
 */
export class DataValidator {
  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * Run all provided rules against every row, returning a full report.
   */
  validateRows(rows: DataRow[], rules: ValidationRule[]): ValidationReport {
    const violations: RowViolation[] = [];
    const warnings: string[] = [];

    rows.forEach((row, idx) => {
      for (const rule of rules) {
        const issues = this.applyRule(row, rule, idx);
        violations.push(...issues);
      }
    });

    const invalidIndices = new Set(violations.map((v) => v.rowIndex));

    if (rows.length > 1000) {
      warnings.push(`Large dataset (${rows.length} rows) — consider batch processing`);
    }

    return {
      totalRows: rows.length,
      validRows: rows.length - invalidIndices.size,
      invalidRows: violations,
      warnings,
    };
  }

  // -----------------------------------------------------------------------
  // Sanitisation
  // -----------------------------------------------------------------------

  /**
   * Clean common data issues and return sanitised rows.
   *
   * - Trims whitespace from all string values
   * - Removes completely empty rows
   * - Fixes common encoding artefacts (e.g. `'` → `'`)
   * - Normalises line breaks inside values
   */
  sanitizeData(rows: DataRow[]): DataRow[] {
    return rows
      .map((row) => {
        const cleaned: DataRow = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === "string") {
            let v = value.trim();
            // Fix common encoding issues
            v = v.replace(/\u2019/g, "'"); // right single quote → apostrophe
            v = v.replace(/\u201C|\u201D/g, '"'); // smart double quotes
            // Normalise line breaks
            v = v.replace(/\r\n|\r/g, "\n");
            cleaned[key] = v;
          } else {
            cleaned[key] = value;
          }
        }
        return cleaned;
      })
      .filter((row) => {
        // Remove completely empty rows
        return !Object.values(row).every((v) => String(v).trim() === "");
      });
  }

  // -----------------------------------------------------------------------
  // Duplicates
  // -----------------------------------------------------------------------

  /**
   * Detect duplicate rows based on the values of the specified key fields.
   *
   * @returns Array of row indices that are duplicates (keeps first occurrence).
   */
  detectDuplicates(rows: DataRow[], keyFields: string[]): number[] {
    const seen = new Set<string>();
    const duplicates: number[] = [];

    rows.forEach((row, idx) => {
      const sig = keyFields.map((f) => String(row[f] ?? "")).join("|");
      if (seen.has(sig)) {
        duplicates.push(idx);
      } else {
        seen.add(sig);
      }
    });

    return duplicates;
  }

  // -----------------------------------------------------------------------
  // Rule application (private)
  // -----------------------------------------------------------------------

  private applyRule(row: DataRow, rule: ValidationRule, rowIndex: number): RowViolation[] {
    const violations: RowViolation[] = [];

    switch (rule.type) {
      case "requiredFields":
        for (const field of rule.fields) {
          if (!row[field] || String(row[field]).trim() === "") {
            violations.push({
              rowIndex,
              field,
              rule: "requiredFields",
              message: `Required field "${field}" is empty`,
            });
          }
        }
        break;

      case "maxLength": {
        const val = String(row[rule.field] ?? "");
        if (val.length > rule.maxLength) {
          violations.push({
            rowIndex,
            field: rule.field,
            rule: "maxLength",
            message: `Field "${rule.field}" exceeds max length of ${rule.maxLength} (actual: ${val.length})`,
          });
        }
        break;
      }

      case "validUrl": {
        const url = String(row[rule.field] ?? "");
        if (url.length > 0 && !URL_RE.test(url)) {
          violations.push({
            rowIndex,
            field: rule.field,
            rule: "validUrl",
            message: `Field "${rule.field}" is not a valid URL`,
          });
        }
        break;
      }

      case "validEmail": {
        const email = String(row[rule.field] ?? "");
        if (email.length > 0 && !EMAIL_RE.test(email)) {
          violations.push({
            rowIndex,
            field: rule.field,
            rule: "validEmail",
            message: `Field "${rule.field}" is not a valid email`,
          });
        }
        break;
      }

      case "pattern": {
        const pval = String(row[rule.field] ?? "");
        if (pval.length > 0 && !rule.pattern.test(pval)) {
          violations.push({
            rowIndex,
            field: rule.field,
            rule: "pattern",
            message: `Field "${rule.field}" does not match required pattern`,
          });
        }
        break;
      }
    }

    return violations;
  }
}
