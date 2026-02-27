import { useState } from "react";
import "./styles/globals.css";

/**
 * BrowserAI Craft Side Panel
 * Main entry point for the extension's user interface
 */
function SidePanel() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    try {
      // Send message to background script to start job
      await chrome.runtime.sendMessage({
        type: "START_JOB",
        payload: { prompt },
      });
    } catch (error) {
      console.error("Failed to start job:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
          🤖 BrowserAI Craft
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          AI-powered browser automation
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* Prompt Input */}
        <div className="mb-4">
          <label
            htmlFor="prompt"
            className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            What would you like to automate?
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create 10 social media posts from my CSV data..."
            className="h-32 w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !prompt.trim()}
          className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Generate"}
        </button>

        {/* Placeholder for future components */}
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-4 text-center dark:border-neutral-600">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Job queue and progress will appear here
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white px-4 py-2 text-center dark:border-neutral-700 dark:bg-neutral-800">
        <p className="text-xs text-neutral-400">BrowserAI Craft v0.1.0</p>
      </footer>
    </div>
  );
}

export default SidePanel;
