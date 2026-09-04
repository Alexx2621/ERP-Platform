import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Testing Library's own findBy*/waitFor polling has its own default
// timeout (1000ms) — separate from, and shorter than, Vitest's own
// testTimeout (vite.config.ts). Raising only testTimeout was not enough:
// a real CI run (constrained 2-core GitHub Actions runner) showed
// inventory-page.spec.tsx failing at ~1.5s with a real
// TestingLibraryElementError once testTimeout stopped masking it, not a
// "Test timed out" error — confirming this second, independent timeout
// was the real remaining bottleneck under genuine CI contention.
configure({ asyncUtilTimeout: 15_000 });

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});
