/**
 * Barrel export for data source modules.
 */

export { CSVParser } from "./CSVParser";
export type { IndexedDataRow } from "./CSVParser";

export { GoogleSheetsConnector } from "./GoogleSheetsConnector";
export type { SheetMetadata, SheetInfo } from "./GoogleSheetsConnector";

export { DataMapper } from "./DataMapper";
export type {
  ColumnMapping,
  MappedData,
  TransformationType,
  Transformation,
  FieldType,
  FieldTypes,
} from "./DataMapper";

export { DataValidator } from "./DataValidator";
export type {
  ValidationRule,
  RequiredFieldsRule,
  MaxLengthRule,
  ValidUrlRule,
  ValidEmailRule,
  PatternRule,
  RowViolation,
  ValidationReport,
} from "./DataValidator";

export { createDataSource, detectDataSourceType } from "./DataSourceFactory";
export type { DataSourceConfig, DataSourceHandle } from "./DataSourceFactory";
