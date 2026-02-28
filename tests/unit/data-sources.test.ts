import { describe, it, expect, vi, beforeEach } from "vitest";
import { CSVParser } from "../../src/data/CSVParser";
import { GoogleSheetsConnector } from "../../src/data/GoogleSheetsConnector";
import { DataMapper } from "../../src/data/DataMapper";
import { DataValidator } from "../../src/data/DataValidator";
import type { ValidationRule } from "../../src/data/DataValidator";
import { createDataSource, detectDataSourceType } from "../../src/data/DataSourceFactory";

// ===========================================================================
// CSVParser
// ===========================================================================

describe("CSVParser", () => {
  let parser: CSVParser;

  beforeEach(() => {
    parser = new CSVParser();
  });

  // --- parseFromText ---

  it("parses simple comma-delimited CSV text", () => {
    const csv = "name,email\nAlice,alice@example.com\nBob,bob@example.com";
    const rows = parser.parseFromText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alice", email: "alice@example.com" });
    expect(rows[1]).toEqual({ name: "Bob", email: "bob@example.com" });
  });

  it("parses semicolon-delimited CSV text", () => {
    const csv = "name;age\nAlice;30\nBob;25";
    const rows = parser.parseFromText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alice", age: "30" });
  });

  it("parses tab-delimited CSV text", () => {
    const csv = "name\tage\nAlice\t30";
    const rows = parser.parseFromText(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "Alice", age: "30" });
  });

  it("trims whitespace from headers and values", () => {
    const csv = " name , email \n Alice , alice@ex.com ";
    const rows = parser.parseFromText(csv);
    expect(rows[0]).toEqual({ name: "Alice", email: "alice@ex.com" });
  });

  it("skips blank lines in the body", () => {
    const csv = "name,age\nAlice,30\n\nBob,25\n";
    const rows = parser.parseFromText(csv);
    expect(rows).toHaveLength(2);
  });

  it("handles quoted fields with commas inside", () => {
    const csv = 'name,address\nAlice,"123 Main St, Apt 4"\nBob,"456 Oak Ave"';
    const rows = parser.parseFromText(csv);
    expect(rows[0].address).toBe("123 Main St, Apt 4");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'name,quote\nAlice,"She said ""hello"""\nBob,"ok"';
    const rows = parser.parseFromText(csv);
    expect(rows[0].quote).toBe('She said "hello"');
  });

  it("throws on empty text", () => {
    expect(() => parser.parseFromText("")).toThrow("CSV text is empty");
  });

  it("throws on header-only CSV", () => {
    expect(() => parser.parseFromText("name,email")).toThrow("at least one data row");
  });

  // --- detectDelimiter ---

  it("detects comma delimiter", () => {
    expect(parser.detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects semicolon delimiter", () => {
    expect(parser.detectDelimiter("a;b;c\n1;2;3")).toBe(";");
  });

  it("detects tab delimiter", () => {
    expect(parser.detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  // --- validateStructure ---

  it("validates rows with consistent columns", () => {
    const rows = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const result = parser.validateStructure(rows);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports error for empty row array", () => {
    const result = parser.validateStructure([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("No data rows");
  });

  it("reports error when expected columns are missing", () => {
    const rows = [{ name: "Alice" }];
    const result = parser.validateStructure(rows, ["name", "email"]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("email"))).toBe(true);
  });

  it("warns about empty rows", () => {
    const rows = [
      { name: "Alice", age: "30" },
      { name: "", age: "" },
    ];
    const result = parser.validateStructure(rows);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain("empty");
  });

  // --- convertToDataRows ---

  it("wraps parsed rows with id and pending status", () => {
    const rows = [{ name: "Alice" }, { name: "Bob" }];
    const indexed = parser.convertToDataRows(rows);
    expect(indexed).toHaveLength(2);
    expect(indexed[0]).toEqual({ id: "row_0", data: { name: "Alice" }, status: "pending" });
    expect(indexed[1].id).toBe("row_1");
  });

  // --- parse (File) ---

  it("parses a File object", async () => {
    const blob = new Blob(["name,age\nAlice,30\nBob,25"], { type: "text/csv" });
    const file = new File([blob], "test.csv", { type: "text/csv" });
    const rows = await parser.parse(file);
    expect(rows).toHaveLength(2);
  });

  it("throws on empty File", async () => {
    const file = new File([], "empty.csv", { type: "text/csv" });
    await expect(parser.parse(file)).rejects.toThrow("empty");
  });

  // --- preview ---

  it("returns only the requested number of rows", async () => {
    const csv = "name\nA\nB\nC\nD\nE\nF";
    const blob = new Blob([csv], { type: "text/csv" });
    const file = new File([blob], "test.csv");
    const preview = await parser.preview(file, 3);
    expect(preview).toHaveLength(3);
  });

  // --- detectEncoding ---

  it("detects plain UTF-8 (no BOM)", async () => {
    const blob = new Blob(["hello"], { type: "text/csv" });
    const file = new File([blob], "test.csv");
    const enc = await parser.detectEncoding(file);
    expect(enc).toBe("utf-8");
  });

  it("detects UTF-8 BOM", async () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, "hello"], { type: "text/csv" });
    const file = new File([blob], "bom.csv");
    const enc = await parser.detectEncoding(file);
    expect(enc).toBe("utf-8-bom");
  });
});

// ===========================================================================
// GoogleSheetsConnector
// ===========================================================================

describe("GoogleSheetsConnector", () => {
  let connector: GoogleSheetsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new GoogleSheetsConnector("test-api-key");
  });

  it("extracts spreadsheet ID from a standard URL", () => {
    const id = connector.extractSpreadsheetId(
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit",
    );
    expect(id).toBe("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms");
  });

  it("throws on an invalid Google Sheets URL", () => {
    expect(() => connector.extractSpreadsheetId("https://example.com")).toThrow(
      "Invalid Google Sheets URL",
    );
  });

  it("fetchSheetData parses API response into DataRow[]", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        values: [
          ["Name", "Title"],
          ["Alice", "Engineer"],
          ["Bob", "Designer"],
        ],
      }),
    } as Response);

    const rows = await connector.fetchSheetData(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "Alice", Title: "Engineer" });
    expect(rows[1]).toEqual({ Name: "Bob", Title: "Designer" });
  });

  it("fetchSheetData throws on 403", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    } as Response);

    await expect(
      connector.fetchSheetData("https://docs.google.com/spreadsheets/d/abc123/edit"),
    ).rejects.toThrow("403");
  });

  it("fetchSheetData throws on 404", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    } as Response);

    await expect(
      connector.fetchSheetData("https://docs.google.com/spreadsheets/d/abc123/edit"),
    ).rejects.toThrow("404");
  });

  it("getSheetMetadata parses metadata response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        properties: { title: "My Sheet" },
        sheets: [
          {
            properties: {
              title: "Sheet1",
              gridProperties: { rowCount: 100, columnCount: 26 },
            },
          },
        ],
      }),
    } as Response);

    const meta = await connector.getSheetMetadata(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );
    expect(meta.title).toBe("My Sheet");
    expect(meta.sheets).toHaveLength(1);
    expect(meta.sheets[0].name).toBe("Sheet1");
    expect(meta.sheets[0].rowCount).toBe(100);
  });

  it("validateSheetAccess returns true for accessible sheets", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ properties: { title: "X" }, sheets: [] }),
    } as Response);

    const access = await connector.validateSheetAccess(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );
    expect(access).toBe(true);
  });

  it("validateSheetAccess returns false for 403", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    } as Response);

    const access = await connector.validateSheetAccess(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );
    expect(access).toBe(false);
  });

  it("setAccessToken allows setting the token directly", () => {
    connector.setAccessToken("my-token");
    // No error means success — the token will be used in subsequent requests
    expect(true).toBe(true);
  });
});

// ===========================================================================
// DataMapper
// ===========================================================================

describe("DataMapper", () => {
  let mapper: DataMapper;

  beforeEach(() => {
    mapper = new DataMapper();
  });

  // --- suggestMapping ---

  it("suggests exact case-insensitive matches", () => {
    const mapping = mapper.suggestMapping(["Name", "Email", "Title"], ["name", "email"]);
    expect(mapping.name).toBe("Name");
    expect(mapping.email).toBe("Email");
  });

  it("suggests contains-based matches", () => {
    const mapping = mapper.suggestMapping(["title_text", "body_text"], ["title"]);
    expect(mapping.title).toBe("title_text");
  });

  it("returns empty mapping when no matches found", () => {
    const mapping = mapper.suggestMapping(["foo", "bar"], ["completely_unrelated_xyz"]);
    expect(Object.keys(mapping)).toHaveLength(0);
  });

  // --- applyMapping ---

  it("applies a mapping to a data row", () => {
    const row = { Name: "Alice", Title: "Engineer" };
    const mapping = { headline: "Name", subtitle: "Title" };
    const result = mapper.applyMapping(row, mapping);
    expect(result).toEqual({ headline: "Alice", subtitle: "Engineer" });
  });

  it("defaults to empty string for missing columns", () => {
    const row = { Name: "Alice" };
    const mapping = { headline: "Name", subtitle: "Missing" };
    const result = mapper.applyMapping(row, mapping);
    expect(result.subtitle).toBe("");
  });

  // --- validateMapping ---

  it("returns true when all required fields are present", () => {
    const mapping = { headline: "Name", subtitle: "Title" };
    expect(mapper.validateMapping(mapping, ["headline", "subtitle"])).toBe(true);
  });

  it("returns false when a required field is missing", () => {
    const mapping = { headline: "Name" };
    expect(mapper.validateMapping(mapping, ["headline", "subtitle"])).toBe(false);
  });

  // --- transformValue ---

  it("transforms to uppercase", () => {
    expect(mapper.transformValue("hello", { type: "uppercase" })).toBe("HELLO");
  });

  it("transforms to lowercase", () => {
    expect(mapper.transformValue("HELLO", { type: "lowercase" })).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(mapper.transformValue("  hello  ", { type: "trim" })).toBe("hello");
  });

  it("truncates to maxLength", () => {
    expect(mapper.transformValue("hello world", { type: "truncate", maxLength: 5 })).toBe("hello");
  });

  it("URL-encodes a value", () => {
    expect(mapper.transformValue("hello world", { type: "urlEncode" })).toBe("hello%20world");
  });

  it("formats a date string to YYYY-MM-DD", () => {
    const result = mapper.transformValue("2024-01-15T10:30:00Z", { type: "dateFormat" });
    expect(result).toBe("2024-01-15");
  });

  it("returns original value for invalid date", () => {
    expect(mapper.transformValue("not-a-date", { type: "dateFormat" })).toBe("not-a-date");
  });

  // --- detectFieldTypes ---

  it("detects number columns", () => {
    const rows = [
      { age: "30", name: "Alice" },
      { age: "25", name: "Bob" },
    ];
    const types = mapper.detectFieldTypes(rows);
    expect(types.age).toBe("number");
    expect(types.name).toBe("text");
  });

  it("detects URL columns", () => {
    const rows = [
      { site: "https://example.com", name: "A" },
      { site: "http://test.com", name: "B" },
    ];
    const types = mapper.detectFieldTypes(rows);
    expect(types.site).toBe("url");
  });

  it("returns empty object for empty rows", () => {
    expect(mapper.detectFieldTypes([])).toEqual({});
  });
});

// ===========================================================================
// DataValidator
// ===========================================================================

describe("DataValidator", () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  // --- validateRows ---

  it("passes when all rows satisfy rules", () => {
    const rows = [{ name: "Alice", email: "alice@example.com" }];
    const rules: ValidationRule[] = [{ type: "requiredFields", fields: ["name", "email"] }];
    const report = validator.validateRows(rows, rules);
    expect(report.validRows).toBe(1);
    expect(report.invalidRows).toHaveLength(0);
  });

  it("detects missing required fields", () => {
    const rows = [{ name: "", email: "alice@example.com" }];
    const rules: ValidationRule[] = [{ type: "requiredFields", fields: ["name"] }];
    const report = validator.validateRows(rows, rules);
    expect(report.validRows).toBe(0);
    expect(report.invalidRows).toHaveLength(1);
    expect(report.invalidRows[0].field).toBe("name");
  });

  it("validates max length", () => {
    const rows = [{ desc: "This is a long description" }];
    const rules: ValidationRule[] = [{ type: "maxLength", field: "desc", maxLength: 10 }];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(1);
  });

  it("validates URLs", () => {
    const rows = [{ site: "not-a-url" }];
    const rules: ValidationRule[] = [{ type: "validUrl", field: "site" }];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(1);
  });

  it("allows valid URLs", () => {
    const rows = [{ site: "https://example.com" }];
    const rules: ValidationRule[] = [{ type: "validUrl", field: "site" }];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(0);
  });

  it("validates emails", () => {
    const rows = [{ email: "invalid-email" }];
    const rules: ValidationRule[] = [{ type: "validEmail", field: "email" }];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(1);
  });

  it("allows valid emails", () => {
    const rows = [{ email: "alice@example.com" }];
    const rules: ValidationRule[] = [{ type: "validEmail", field: "email" }];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(0);
  });

  it("validates pattern rules", () => {
    const rows = [{ phone: "123-456" }];
    const rules: ValidationRule[] = [
      { type: "pattern", field: "phone", pattern: /^\d{3}-\d{3}-\d{4}$/ },
    ];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(1);
  });

  it("passes matching pattern", () => {
    const rows = [{ phone: "123-456-7890" }];
    const rules: ValidationRule[] = [
      { type: "pattern", field: "phone", pattern: /^\d{3}-\d{3}-\d{4}$/ },
    ];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(0);
  });

  it("skips validation for empty optional fields (URL/email/pattern)", () => {
    const rows = [{ site: "", email: "", phone: "" }];
    const rules: ValidationRule[] = [
      { type: "validUrl", field: "site" },
      { type: "validEmail", field: "email" },
      { type: "pattern", field: "phone", pattern: /^\d+$/ },
    ];
    const report = validator.validateRows(rows, rules);
    expect(report.invalidRows).toHaveLength(0);
  });

  // --- sanitizeData ---

  it("trims whitespace and removes empty rows", () => {
    const rows = [
      { name: "  Alice  ", age: " 30 " },
      { name: "", age: "" },
    ];
    const cleaned = validator.sanitizeData(rows);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe("Alice");
    expect(cleaned[0].age).toBe("30");
  });

  it("fixes smart quotes", () => {
    const rows = [{ text: "It\u2019s a \u201Ctest\u201D" }];
    const cleaned = validator.sanitizeData(rows);
    expect(cleaned[0].text).toBe("It's a \"test\"");
  });

  // --- detectDuplicates ---

  it("detects duplicate rows", () => {
    const rows = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
      { name: "Alice", email: "alice@example.com" },
    ];
    const dupes = validator.detectDuplicates(rows, ["name", "email"]);
    expect(dupes).toEqual([2]);
  });

  it("returns empty array when no duplicates", () => {
    const rows = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];
    const dupes = validator.detectDuplicates(rows, ["name", "email"]);
    expect(dupes).toEqual([]);
  });
});

// ===========================================================================
// DataSourceFactory
// ===========================================================================

describe("DataSourceFactory", () => {
  // --- detectDataSourceType ---

  it("detects Google Sheets URL", () => {
    expect(
      detectDataSourceType("https://docs.google.com/spreadsheets/d/abc/edit"),
    ).toBe("sheets");
  });

  it("detects CSV file extension", () => {
    expect(detectDataSourceType("data.csv")).toBe("csv");
  });

  it("detects JSON array", () => {
    expect(detectDataSourceType('[{"a":1}]')).toBe("json");
  });

  it("detects JSON object", () => {
    expect(detectDataSourceType('{"key":"val"}')).toBe("json");
  });

  it("returns unknown for unrecognised input", () => {
    expect(detectDataSourceType("some random text")).toBe("unknown");
  });

  // --- createDataSource ---

  it("creates a CSV data source and loads rows", async () => {
    const blob = new Blob(["name,age\nAlice,30"], { type: "text/csv" });
    const file = new File([blob], "test.csv");
    const source = createDataSource({ type: "csv", file });
    expect(source.type).toBe("csv");
    const rows = await source.load();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice");
  });

  it("creates a JSON data source and loads rows", async () => {
    const source = createDataSource({
      type: "json",
      data: '[{"name":"Alice"},{"name":"Bob"}]',
    });
    const rows = await source.load();
    expect(rows).toHaveLength(2);
  });

  it("creates a manual data source and loads rows", async () => {
    const source = createDataSource({
      type: "manual",
      rows: [{ name: "Alice" }],
    });
    const rows = await source.load();
    expect(rows).toHaveLength(1);
  });

  it("throws for unknown data source type", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => createDataSource({ type: "unknown" as any })).toThrow("Unknown data source type");
  });

  it("throws when CSV source is missing file", () => {
    expect(() => createDataSource({ type: "csv" })).toThrow("requires a file");
  });

  it("throws when sheets source is missing sheetUrl", () => {
    expect(() => createDataSource({ type: "sheets" })).toThrow("requires a sheetUrl");
  });

  it("throws when JSON source is missing data", () => {
    expect(() => createDataSource({ type: "json" })).toThrow("requires data");
  });

  it("throws when manual source has no rows", () => {
    expect(() => createDataSource({ type: "manual", rows: [] })).toThrow("requires at least one");
  });
});
