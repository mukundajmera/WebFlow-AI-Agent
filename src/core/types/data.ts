/**
 * Data source and parsing types
 */

/**
 * Types of data sources supported
 */
export type DataSourceType = "csv" | "sheets" | "json" | "manual";

/**
 * A data source configuration
 */
export interface DataSource {
  type: DataSourceType;
  /** File object or URL to the data */
  source: File | string;
  config?: DataSourceConfig;
}

/**
 * Configuration options for data sources
 */
export interface DataSourceConfig {
  /** CSV delimiter character */
  delimiter?: string;
  /** Whether CSV has header row */
  hasHeader?: boolean;
  /** Google Sheets sheet name */
  sheetName?: string;
  /** Google Sheets range (e.g., "A1:Z100") */
  range?: string;
}

/**
 * A single row of data
 */
export type DataRow = Record<string, string | number>;

/**
 * Parsed data from a source
 */
export interface ParsedData {
  rows: DataRow[];
  headers: string[];
  source: DataSource;
  parsedAt: string;
}

/**
 * Collection of assets (images, fonts, etc.)
 */
export interface AssetCollection {
  logos: FileRef[];
  images: FileRef[];
  fonts?: FontRef[];
  colors?: ColorPalette;
}

/**
 * Reference to a file
 */
export interface FileRef {
  /** Local file path */
  path?: string;
  /** Remote URL */
  url?: string;
  /** In-memory blob */
  blob?: Blob;
  /** MIME type */
  type: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size?: number;
}

/**
 * Reference to a font
 */
export interface FontRef {
  family: string;
  url?: string;
  variants?: string[];
}

/**
 * Color palette definition
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

/**
 * Result of validating data
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * A validation error
 */
export interface ValidationError {
  field?: string;
  message: string;
  row?: number;
}

/**
 * A validation warning
 */
export interface ValidationWarning {
  field?: string;
  message: string;
  row?: number;
  suggestion?: string;
}

/**
 * Schema for data validation
 */
export interface DataSchema {
  fields: SchemaField[];
  /** Whether extra fields are allowed */
  allowExtra?: boolean;
}

/**
 * A field in a data schema
 */
export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
}
