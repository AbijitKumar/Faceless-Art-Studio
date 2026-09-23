import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore
import pkg from "./package.json" with { type: "json" };
// @ts-ignore
import { execSync } from "child_process";

// Read package.json version dynamically from package metadata
const pkgVersion = pkg?.version || "1.2.0";
let appVersion = `v${pkgVersion}`;
try {
  const gitVersion = execSync("git describe --tags --always", { encoding: "utf8" }).trim();
  if (gitVersion) {
    appVersion = gitVersion;
  }
} catch {
  // fallback to dynamic package.json version
  appVersion = `v${pkgVersion}`;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/output": "http://127.0.0.1:8000",
      "/input": "http://127.0.0.1:8000",
    },
  },
});