import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    globals: true,
    // Vitest's 5000ms default is tight for this suite's real, multi-step
    // component tests (several already run 8-13s even locally) under a
    // constrained 2-core GitHub Actions runner — confirmed as a real,
    // pre-existing CI flake (inventory-page.spec.tsx timing out on a pure
    // documentation commit with zero code changes), not test-specific
    // slowness. 20s matches this session's own observed real durations
    // with real headroom, rather than papering over a genuine hang.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
