/**
 * DataSourceFactory — Create the appropriate data-source connector.
 *
 * Provides a factory function that returns a normalised data-source object
 * and a helper to auto-detect the data source type from user input.
 */

import type { DataRow, DataSourceType } from "~types/data";
import { CSVParser } from "./CSVParser";
import { GoogleSheetsConnector } from "./GoogleSheetsConnector";

// ---------------------------------------------------------------------------
// Unified DataSource interface returned by the factory
// ---------------------------------------------------------------------------

/**
 * Configuration object accepted by the factory.
 */
export interface DataSourceConfig {
  type: DataSourceType;
  /** CSV file (when type === 'csv'). */
  file?: File;
  /** Google Sheets URL (when type === 'sheets'). */
  sheetUrl?: string;
  /** A1 range for Google Sheets. */
  range?: string;
  /** Inline JSON data (when type === 'json'). */
  data?: string;
  /** Manual rows (when type === 'manual'). */
  rows?: DataRow[];
}

/**
 * Normalised data source with a `load()` method.
 */
export interface DataSourceHandle {
  type: DataSourceType;
  /** Load and return all rows from the data source. */
  load(): Promise<DataRow[]>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link DataSourceHandle} for the given configuration.
 *
 * @throws If the source type is unknown or required config is missing.
 */
export function createDataSource(config: DataSourceConfig): DataSourceHandle {
  switch (config.type) {
    case "csv":
      return createCSVSource(config);
    case "sheets":
      return createSheetsSource(config);
    case "json":
      return createJSONSource(config);
    case "manual":
      return createManualSource(config);
    default:
      throw new Error(`Unknown data source type: "${config.type as string}"`);
  }
}

/**
 * Auto-detect the {@link DataSourceType} from user input (URL, filename,
 * or inline data).
 */
export function detectDataSourceType(input: string): DataSourceType | "unknown" {
  if (input.startsWith("https://docs.google.com/spreadsheets")) {
    return "sheets";
  }
  if (input.endsWith(".csv")) {
    return "csv";
  }
  if (input.startsWith("{") || input.startsWith("[")) {
    return "json";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Concrete sources (private)
// ---------------------------------------------------------------------------

function createCSVSource(config: DataSourceConfig): DataSourceHandle {
  if (!config.file) {
    throw new Error("CSV data source requires a file");
  }
  const parser = new CSVParser();
  const file = config.file;
  return {
    type: "csv",
    async load() {
      return parser.parse(file);
    },
  };
}

function createSheetsSource(config: DataSourceConfig): DataSourceHandle {
  if (!config.sheetUrl) {
    throw new Error("Google Sheets data source requires a sheetUrl");
  }
  const connector = new GoogleSheetsConnector();
  const url = config.sheetUrl;
  const range = config.range;
  return {
    type: "sheets",
    async load() {
      return connector.fetchSheetData(url, range);
    },
  };
}

function createJSONSource(config: DataSourceConfig): DataSourceHandle {
  if (!config.data) {
    throw new Error("JSON data source requires data");
  }
  const raw = config.data;
  return {
    type: "json",
    async load() {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON data must be an array of objects");
      }
      return parsed as DataRow[];
    },
  };
}

function createManualSource(config: DataSourceConfig): DataSourceHandle {
  if (!config.rows || config.rows.length === 0) {
    throw new Error("Manual data source requires at least one row");
  }
  const rows = config.rows;
  return {
    type: "manual",
    async load() {
      return rows;
    },
  };
}
