import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Testing Library's own findBy*/waitFor polling has its own default timeout
// (1000ms), independent of and shorter than Vitest's `testTimeout` — raising
// only the latter (vitest.config.ts) can unmask this one under the same CI
// contention instead of fixing it. Same fix already applied to
// apps/erp-web's own test/setup.ts for exactly this reason.
configure({ asyncUtilTimeout: 15_000 });

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});
