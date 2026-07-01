import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/api/src/**/*.ts", "packages/crypto/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/index.ts",
        "packages/api/src/trpc.ts",
        "packages/api/src/utils/logger.ts",
      ],
      thresholds: {
        "packages/api/src/**": {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        "packages/crypto/src/**": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@repo/api": path.resolve(__dirname, "./packages/api/src"),
      "@repo/crypto": path.resolve(__dirname, "./packages/crypto/src"),
      "@repo/db": path.resolve(__dirname, "./packages/db/src"),
    },
  },
});
