import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Note: the `test` script in package.json runs this through
// `cross-env NODE_OPTIONS=--no-experimental-webstorage` — recent Node
// versions (observed on Node 25) ship an experimental native
// `globalThis.localStorage` that, without `--localstorage-file`, is a
// non-functional stub. It otherwise wins over jsdom's own real
// `window.localStorage` implementation for every test in this suite that
// touches the cart token (localStorage-backed by design — see
// src/lib/cart-storage.ts). Disabling Node's experimental one lets jsdom's
// real implementation take over.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    globals: true,
  },
});
