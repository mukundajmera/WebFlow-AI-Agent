/**
 * GoogleSheetsConnector — Connect to Google Sheets and fetch data.
 *
 * Provides OAuth authentication (via `chrome.identity`), sheet data fetching,
 * metadata retrieval, and token management for the Chrome extension context.
 */

import type { DataRow } from "~types/data";

/** Base URL for the Google Sheets v4 API. */
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** Key used to persist the OAuth access token in `chrome.storage.local`. */
const TOKEN_STORAGE_KEY = "google_sheets_access_token";

/**
 * Shape of the Google Sheets API `GET /spreadsheets/{id}` response
 * (only the fields we use).
 */
interface SpreadsheetResource {
  properties?: { title?: string };
  sheets?: {
    properties?: {
      title?: string;
      gridProperties?: { rowCount?: number; columnCount?: number };
    };
  }[];
}

/**
 * Callback-based Chrome identity token getter.
 */
interface ChromeIdentityLike {
  getAuthToken(options: { interactive: boolean }, callback: (token: string) => void): void;
}

/**
 * Metadata about a Google Sheets spreadsheet.
 */
export interface SheetMetadata {
  title: string;
  sheets: { name: string; rowCount: number; columnCount: number }[];
}

/**
 * Minimal information about a spreadsheet (used in listing).
 */
export interface SheetInfo {
  id: string;
  name: string;
  url: string;
}

/**
 * GoogleSheetsConnector handles authentication and data fetching from the
 * Google Sheets API.
 */
export class GoogleSheetsConnector {
  private accessToken: string | null = null;

  constructor(private apiKey?: string) {}

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  /**
   * Authenticate via the Chrome identity API (OAuth2 web-auth flow).
   *
   * Stores the resulting access token in `chrome.storage.local`.
   */
  async authenticate(): Promise<void> {
    // In a real Chrome extension this would use chrome.identity
    // Here we provide a pluggable implementation.
    if (typeof chrome !== "undefined" && chrome.identity) {
      const identity = chrome.identity as unknown as ChromeIdentityLike;
      const token = await new Promise<string>((resolve, reject) => {
        identity.getAuthToken({ interactive: true }, (tok: string) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!tok) {
            reject(new Error("Authentication cancelled or token unavailable"));
          } else {
            resolve(tok);
          }
        });
      });
      this.accessToken = token;
      await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
    } else {
      throw new Error("Google authentication requires a Chrome extension environment");
    }
  }

  /**
   * Refresh / restore the access token from storage.
   */
  async refreshToken(): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
      this.accessToken = (result[TOKEN_STORAGE_KEY] as string) || null;
    }
  }

  /**
   * Set the access token directly (useful for testing or non-extension contexts).
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  // -----------------------------------------------------------------------
  // Data Fetching
  // -----------------------------------------------------------------------

  /**
   * Fetch row data from a Google Sheets spreadsheet.
   *
   * @param sheetUrl - The full URL of the spreadsheet.
   * @param range    - The A1-notation range (defaults to `"A1:Z1000"`).
   * @returns Parsed rows as {@link DataRow}[].
   */
  async fetchSheetData(sheetUrl: string, range = "A1:Z1000"): Promise<DataRow[]> {
    const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
    const url = this.buildApiUrl(spreadsheetId, range);

    const response = await fetch(url, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      await this.handleApiError(response, sheetUrl);
    }

    const json = (await response.json()) as { values?: string[][] };
    const values = json.values;

    if (!values || values.length < 2) {
      throw new Error("Sheet contains no data or only a header row");
    }

    const headers = values[0].map((h) => h.trim());
    const rows: DataRow[] = [];

    for (let i = 1; i < values.length; i++) {
      const row: DataRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[i][idx]?.trim() ?? "";
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Retrieve metadata (title, sheet names, row/column counts) for a
   * spreadsheet.
   */
  async getSheetMetadata(sheetUrl: string): Promise<SheetMetadata> {
    const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
    const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}`;

    const response = await fetch(url, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      await this.handleApiError(response, sheetUrl);
    }

    const json = (await response.json()) as SpreadsheetResource;

    return {
      title: json.properties?.title ?? "Untitled",
      sheets: (json.sheets ?? []).map((s) => ({
        name: s.properties?.title ?? "Sheet",
        rowCount: s.properties?.gridProperties?.rowCount ?? 0,
        columnCount: s.properties?.gridProperties?.columnCount ?? 0,
      })),
    };
  }

  /**
   * Check whether the current user can access a sheet.
   *
   * @returns `true` if accessible, `false` if permission denied.
   * @throws If the sheet does not exist (404).
   */
  async validateSheetAccess(sheetUrl: string): Promise<boolean> {
    try {
      await this.getSheetMetadata(sheetUrl);
      return true;
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (message.includes("403")) return false;
      throw err;
    }
  }

  /**
   * Extract the spreadsheet ID from a Google Sheets URL.
   *
   * Accepts URLs of the form:
   *   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...`
   */
  extractSpreadsheetId(sheetUrl: string): string {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      throw new Error(`Invalid Google Sheets URL: "${sheetUrl}"`);
    }
    return match[1];
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildApiUrl(spreadsheetId: string, range: string): string {
    const base = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
    if (this.apiKey) {
      return `${base}?key=${encodeURIComponent(this.apiKey)}`;
    }
    return base;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async handleApiError(response: Response, sheetUrl: string): Promise<never> {
    const status = response.status;
    if (status === 403) {
      throw new Error(`403: No permission to access sheet "${sheetUrl}". Please grant access.`);
    }
    if (status === 404) {
      throw new Error(`404: Sheet not found at "${sheetUrl}". Verify the URL is correct.`);
    }
    const body = await response.text().catch(() => "");
    throw new Error(`Google Sheets API error (${status}): ${body}`);
  }
}
