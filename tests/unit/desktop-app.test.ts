import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DESKTOP_DIR = path.resolve(__dirname, "../../desktop");

/**
 * Tests for Prompt 5.1: Desktop App with Electron — structural verification.
 *
 * Because Electron modules cannot be imported in a happy-dom test environment,
 * we validate the file structure, configuration, and key code patterns.
 */

// ===========================================================================
// File existence
// ===========================================================================

describe("Desktop App — file structure", () => {
  it("main.ts exists", () => {
    expect(existsSync(path.join(DESKTOP_DIR, "main.ts"))).toBe(true);
  });

  it("preload.ts exists", () => {
    expect(existsSync(path.join(DESKTOP_DIR, "preload.ts"))).toBe(true);
  });

  it("package.json exists", () => {
    expect(existsSync(path.join(DESKTOP_DIR, "package.json"))).toBe(true);
  });

  it("tsconfig.json exists", () => {
    expect(existsSync(path.join(DESKTOP_DIR, "tsconfig.json"))).toBe(true);
  });
});

// ===========================================================================
// package.json — build config
// ===========================================================================

describe("Desktop App — package.json", () => {
  const pkg = JSON.parse(readFileSync(path.join(DESKTOP_DIR, "package.json"), "utf-8"));

  it("has appId in build config", () => {
    expect(pkg.build.appId).toBe("com.browserai.craft");
  });

  it("defines mac, win, and linux targets", () => {
    expect(pkg.build.mac).toBeDefined();
    expect(pkg.build.win).toBeDefined();
    expect(pkg.build.linux).toBeDefined();
  });

  it("mac target includes dmg", () => {
    expect(pkg.build.mac.target).toContain("dmg");
  });

  it("win target includes nsis", () => {
    expect(pkg.build.win.target).toContain("nsis");
  });

  it("linux target includes AppImage", () => {
    expect(pkg.build.linux.target).toContain("AppImage");
  });

  it("has electron as a devDependency", () => {
    expect(pkg.devDependencies.electron).toBeDefined();
  });

  it("has electron-builder as a devDependency", () => {
    expect(pkg.devDependencies["electron-builder"]).toBeDefined();
  });

  it("has build scripts for each platform", () => {
    expect(pkg.scripts["build:mac"]).toBeDefined();
    expect(pkg.scripts["build:win"]).toBeDefined();
    expect(pkg.scripts["build:linux"]).toBeDefined();
  });
});

// ===========================================================================
// main.ts — code patterns
// ===========================================================================

describe("Desktop App — main.ts patterns", () => {
  const mainSrc = readFileSync(path.join(DESKTOP_DIR, "main.ts"), "utf-8");

  it("imports BrowserWindow from electron", () => {
    expect(mainSrc).toContain("BrowserWindow");
  });

  it("imports Tray from electron", () => {
    expect(mainSrc).toContain("Tray");
  });

  it("imports ipcMain from electron", () => {
    expect(mainSrc).toContain("ipcMain");
  });

  it("creates a main window with contextIsolation", () => {
    expect(mainSrc).toContain("contextIsolation: true");
  });

  it("disables nodeIntegration", () => {
    expect(mainSrc).toContain("nodeIntegration: false");
  });

  it("handles LM Studio start/stop", () => {
    expect(mainSrc).toContain("startLMStudio");
    expect(mainSrc).toContain("stopLMStudio");
  });

  it("handles Ollama start/stop", () => {
    expect(mainSrc).toContain("startOllama");
    expect(mainSrc).toContain("stopOllama");
  });

  it("has IPC handler for select-file", () => {
    expect(mainSrc).toContain('"select-file"');
  });

  it("has IPC handler for save-file", () => {
    expect(mainSrc).toContain('"save-file"');
  });

  it("loads the Chrome extension", () => {
    expect(mainSrc).toContain("loadExtension");
  });

  it("includes waitForServer utility", () => {
    expect(mainSrc).toContain("waitForServer");
  });

  it("cleans up MCP servers on before-quit", () => {
    expect(mainSrc).toContain("before-quit");
    expect(mainSrc).toContain("stopAllMCPServers");
  });
});

// ===========================================================================
// preload.ts — code patterns
// ===========================================================================

describe("Desktop App — preload.ts patterns", () => {
  const preloadSrc = readFileSync(path.join(DESKTOP_DIR, "preload.ts"), "utf-8");

  it("imports contextBridge from electron", () => {
    expect(preloadSrc).toContain("contextBridge");
  });

  it("imports ipcRenderer from electron", () => {
    expect(preloadSrc).toContain("ipcRenderer");
  });

  it("exposes API via exposeInMainWorld", () => {
    expect(preloadSrc).toContain("exposeInMainWorld");
  });

  it("exposes LM Studio and Ollama controls", () => {
    expect(preloadSrc).toContain("startLMStudio");
    expect(preloadSrc).toContain("stopLMStudio");
    expect(preloadSrc).toContain("startOllama");
    expect(preloadSrc).toContain("stopOllama");
  });

  it("exposes file operations", () => {
    expect(preloadSrc).toContain("selectFile");
    expect(preloadSrc).toContain("saveFile");
  });

  it("exposes event listeners for status updates", () => {
    expect(preloadSrc).toContain("onLMStudioStatus");
    expect(preloadSrc).toContain("onOllamaStatus");
    expect(preloadSrc).toContain("onTrayStartJob");
  });

  it("defines ElectronBridge interface", () => {
    expect(preloadSrc).toContain("ElectronBridge");
  });
});
