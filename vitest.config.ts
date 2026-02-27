import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
      "~core": `${__dirname}src/core`,
      "~sidepanel": `${__dirname}src/sidepanel`,
      "~background": `${__dirname}src/background`,
      "~contents": `${__dirname}src/contents`,
      "~adapters": `${__dirname}adapters`,
      "~types": `${__dirname}src/core/types`,
      "~utils": `${__dirname}src/core/utils`,
    },
  },
});
