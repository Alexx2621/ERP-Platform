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

// jsdom has no ResizeObserver implementation at all — needed by
// react-grid-layout's WidthProvider (the home dashboard), which measures
// its container on mount to size the grid. A minimal no-op stand-in is
// enough: nothing under test asserts on a real resize callback firing.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});
