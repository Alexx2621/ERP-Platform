import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Match this monorepo's turbo.json, which declares "dist/**" as the build
  // output for every app/package — keeps Turbo's caching consistent across
  // the whole workspace instead of the Next.js default of ".next".
  distDir: "dist",

  // This repo lives under a parent directory that also happens to have its
  // own pnpm-lock.yaml (a sibling/unrelated project one level up in this
  // dev environment) — without this, Next.js's root auto-detection walks
  // up and picks that unrelated lockfile as the workspace root, which
  // breaks its file-tracing. Pin it explicitly to this repo's own root.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // @erp/api-client ships its TypeScript source directly (see its
  // package.json "exports" — no compiled dist/ of its own), the same way
  // apps/erp-web already consumes it via Vite. Next.js only transpiles
  // workspace/node_modules packages that are explicitly opted in here.
  transpilePackages: ["@erp/api-client"],

  webpack: (config) => {
    // @erp/api-client is written as NodeNext-style ESM TypeScript: its
    // internal imports use explicit ".js" extensions that actually resolve
    // to ".ts" files on disk (e.g. `export * from "./api-client.js"`,
    // where only api-client.ts exists). Vite/esbuild (apps/erp-web) resolve
    // this out of the box; webpack (Next's bundler) needs to be told
    // explicitly that a ".js" specifier may resolve to a ".ts"/".tsx" file.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },

  // Linting has its own dedicated `pnpm --filter @erp/storefront run lint`
  // script (a flat ESLint config extending the repo root's, matching
  // apps/erp-web) run as its own step in the monorepo's CI/validation
  // pipeline — Next's bundled lint-on-build would duplicate that with a
  // different rule set (`eslint-config-next`, not installed here) and is
  // disabled to keep `next build` focused on compiling.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
