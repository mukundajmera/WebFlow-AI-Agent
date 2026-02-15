import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**/*", "node_modules/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "~core": path.resolve(__dirname, "./src/core"),
      "~sidepanel": path.resolve(__dirname, "./src/sidepanel"),
      "~background": path.resolve(__dirname, "./src/background"),
      "~contents": path.resolve(__dirname, "./src/contents"),
      "~adapters": path.resolve(__dirname, "./adapters"),
      "~types": path.resolve(__dirname, "./src/core/types"),
      "~utils": path.resolve(__dirname, "./src/core/utils"),
    },
  },
});
