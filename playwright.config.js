import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:5173", headless: true, channel: "msedge" },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  reporter: "list",
});
