/**
 * BrowserAI Craft — Electron Preload Script
 *
 * Provides a secure bridge between the renderer process and the main
 * process using `contextBridge`. Only whitelisted methods are exposed
 * to the web page via `window.electron`.
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * Shape of the API exposed to the renderer via `window.electron`.
 */
export interface ElectronBridge {
  // LM Studio controls
  startLMStudio: () => Promise<{ success: boolean; error?: string }>;
  stopLMStudio: () => Promise<{ success: boolean }>;

  // Ollama controls
  startOllama: () => Promise<{ success: boolean; error?: string }>;
  stopOllama: () => Promise<{ success: boolean }>;

  // File operations
  selectFile: () => Promise<{ path: string; content: string } | null>;
  saveFile: (data: {
    filename: string;
    content: string;
    filters: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  // App info
  getAppPath: () => Promise<string>;

  // Event listeners
  onLMStudioStatus: (callback: (data: { running: boolean }) => void) => void;
  onOllamaStatus: (callback: (data: { running: boolean }) => void) => void;
  onTrayStartJob: (callback: () => void) => void;
}

// ---------------------------------------------------------------------------
// Expose protected API
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld("electron", {
  // LM Studio
  startLMStudio: () => ipcRenderer.invoke("start-lmstudio"),
  stopLMStudio: () => ipcRenderer.invoke("stop-lmstudio"),

  // Ollama
  startOllama: () => ipcRenderer.invoke("start-ollama"),
  stopOllama: () => ipcRenderer.invoke("stop-ollama"),

  // File operations
  selectFile: () => ipcRenderer.invoke("select-file"),
  saveFile: (data: {
    filename: string;
    content: string;
    filters: { name: string; extensions: string[] }[];
  }) => ipcRenderer.invoke("save-file", data),

  // App info
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // Event listeners (one-way from main → renderer)
  onLMStudioStatus: (callback: (data: { running: boolean }) => void) => {
    ipcRenderer.on("lmstudio-status", (_event, data) => callback(data));
  },
  onOllamaStatus: (callback: (data: { running: boolean }) => void) => {
    ipcRenderer.on("ollama-status", (_event, data) => callback(data));
  },
  onTrayStartJob: (callback: () => void) => {
    ipcRenderer.on("tray-start-job", () => callback());
  },
} satisfies ElectronBridge);
