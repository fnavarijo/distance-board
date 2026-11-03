import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: [".env.local", ".env.test.local"], quiet: true });

// These tests run against the real Firebase project, so they run one file at a time.
export default defineConfig({
  test: {
    include: ["tests/rules/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
