import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one database; run files serially.
    fileParallelism: false,
    testTimeout: 30000,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", APP_SECRET: "test-secret-0123456789abcdef" },
  },
});
