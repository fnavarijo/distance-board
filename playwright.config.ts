import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// `next dev` doesn't load .env.test.local, so the logins are read here.
loadEnv({ path: [".env.local", ".env.test.local"], quiet: true });

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1,
  globalSetup: "./e2e/sweep.ts",
  globalTeardown: "./e2e/sweep.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_TEST_SIGN_IN: "1" },
  },
});
