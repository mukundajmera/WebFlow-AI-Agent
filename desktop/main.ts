/**
 * BrowserAI Craft — Electron Main Process
 *
 * Creates the main application window, system tray, MCP server lifecycle
 * management (LM Studio / Ollama), Chrome extension loading, and IPC
 * handlers for native file operations.
 *
 * Cross-platform support: Windows, macOS, Linux.
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";

// ── Global references ──────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const mcpServers: Record<string, ChildProcess | null> = {
  lmstudio: null,
  ollama: null,
};

// ── App Lifecycle ──────────────────────────────────────────────────────────────

app.on("ready", async () => {
  await createMainWindow();
  createSystemTray();
  await startMCPServers();
  await loadExtension();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  stopAllMCPServers();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// ── Main Window ────────────────────────────────────────────────────────────────

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: "BrowserAI Craft",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── System Tray ────────────────────────────────────────────────────────────────

function createSystemTray(): void {
  const iconPath = path.join(__dirname, "assets", "tray-icon.png");
  if (!fs.existsSync(iconPath)) return; // Gracefully skip if no icon available

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show BrowserAI Craft", click: () => mainWindow?.show() },
    {
      label: "Start Job",
      click: () => mainWindow?.webContents.send("tray-start-job"),
    },
    { type: "separator" },
    {
      label: "LM Studio",
      submenu: [
        { label: "Start", click: () => startLMStudio() },
        { label: "Stop", click: () => stopLMStudio() },
      ],
    },
    {
      label: "Ollama",
      submenu: [
        { label: "Start", click: () => startOllama() },
        { label: "Stop", click: () => stopOllama() },
      ],
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip("BrowserAI Craft");

  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// ── MCP Server Management ──────────────────────────────────────────────────────

async function startMCPServers(): Promise<void> {
  try {
    await startLMStudio();
  } catch {
    // LM Studio not available — non-fatal
  }

  try {
    await startOllama();
  } catch {
    // Ollama not available — non-fatal
  }
}

function stopAllMCPServers(): void {
  if (mcpServers.lmstudio) {
    mcpServers.lmstudio.kill();
    mcpServers.lmstudio = null;
  }
  if (mcpServers.ollama) {
    mcpServers.ollama.kill();
    mcpServers.ollama = null;
  }
}

// ── LM Studio ──────────────────────────────────────────────────────────────────

async function startLMStudio(): Promise<void> {
  const lmstudioPath = findExecutable(LM_STUDIO_PATHS);
  if (!lmstudioPath) throw new Error("LM Studio not installed");

  mcpServers.lmstudio = spawn(lmstudioPath, ["--server"], { detached: true });

  mcpServers.lmstudio.stdout?.on("data", (data: Buffer) => {
    mainWindow?.webContents.send("lmstudio-log", data.toString());
  });

  mcpServers.lmstudio.stderr?.on("data", (data: Buffer) => {
    mainWindow?.webContents.send("lmstudio-log", `[stderr] ${data.toString()}`);
  });

  await waitForServer("http://localhost:1234", 30_000);
  mainWindow?.webContents.send("lmstudio-status", { running: true });
}

function stopLMStudio(): void {
  if (mcpServers.lmstudio) {
    mcpServers.lmstudio.kill();
    mcpServers.lmstudio = null;
    mainWindow?.webContents.send("lmstudio-status", { running: false });
  }
}

// ── Ollama ─────────────────────────────────────────────────────────────────────

async function startOllama(): Promise<void> {
  const ollamaPath = findExecutable(OLLAMA_PATHS);
  if (!ollamaPath) throw new Error("Ollama not installed");

  mcpServers.ollama = spawn(ollamaPath, ["serve"], { detached: true });

  mcpServers.ollama.stdout?.on("data", (data: Buffer) => {
    mainWindow?.webContents.send("ollama-log", data.toString());
  });

  mcpServers.ollama.stderr?.on("data", (data: Buffer) => {
    mainWindow?.webContents.send("ollama-log", `[stderr] ${data.toString()}`);
  });

  await waitForServer("http://localhost:11434", 30_000);
  mainWindow?.webContents.send("ollama-status", { running: true });
}

function stopOllama(): void {
  if (mcpServers.ollama) {
    mcpServers.ollama.kill();
    mcpServers.ollama = null;
    mainWindow?.webContents.send("ollama-status", { running: false });
  }
}

// ── Chrome Extension Loading ───────────────────────────────────────────────────

async function loadExtension(): Promise<void> {
  const extensionPath = path.join(__dirname, "..", "extension");
  if (!mainWindow) return;

  try {
    await mainWindow.webContents.session.loadExtension(extensionPath, {
      allowFileAccess: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox("Extension Error", `Failed to load extension: ${message}`);
  }
}

// ── IPC Handlers ───────────────────────────────────────────────────────────────

ipcMain.handle("start-lmstudio", async () => {
  try {
    await startLMStudio();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("stop-lmstudio", () => {
  stopLMStudio();
  return { success: true };
});

ipcMain.handle("start-ollama", async () => {
  try {
    await startOllama();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("stop-ollama", () => {
  stopOllama();
  return { success: true };
});

ipcMain.handle("select-file", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "CSV Files", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, "utf-8");

  return { path: filePath, content };
});

interface SaveFileRequest {
  filename: string;
  content: string;
  filters: Electron.FileFilter[];
}

ipcMain.handle("save-file", async (_event, data: SaveFileRequest) => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: data.filename,
    filters: data.filters,
  });

  if (result.canceled || !result.filePath) return null;

  fs.writeFileSync(result.filePath, data.content);
  return result.filePath;
});

ipcMain.handle("get-app-path", () => app.getPath("userData"));

// ── Utility: Executable Path Resolution ────────────────────────────────────────

const LM_STUDIO_PATHS: Record<string, string[]> = {
  win32: [
    path.join(process.env.LOCALAPPDATA ?? "", "LM Studio", "lmstudio.exe"),
    "C:\\Program Files\\LM Studio\\lmstudio.exe",
  ],
  darwin: [
    "/Applications/LM Studio.app/Contents/MacOS/LM Studio",
    path.join(process.env.HOME ?? "", "Applications/LM Studio.app/Contents/MacOS/LM Studio"),
  ],
  linux: [
    "/usr/bin/lmstudio",
    "/usr/local/bin/lmstudio",
    path.join(process.env.HOME ?? "", ".local/bin/lmstudio"),
  ],
};

const OLLAMA_PATHS: Record<string, string[]> = {
  win32: [
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Ollama", "ollama.exe"),
    "C:\\Program Files\\Ollama\\ollama.exe",
  ],
  darwin: [
    "/usr/local/bin/ollama",
    path.join(process.env.HOME ?? "", ".ollama/ollama"),
  ],
  linux: ["/usr/bin/ollama", "/usr/local/bin/ollama"],
};

function findExecutable(pathMap: Record<string, string[]>): string | null {
  const candidates = pathMap[process.platform] ?? [];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ── Utility: Wait for HTTP Server ──────────────────────────────────────────────

async function waitForServer(url: string, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Server at ${url} failed to start within ${timeout}ms`);
}
