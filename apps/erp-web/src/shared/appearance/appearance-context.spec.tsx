import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { apiClient } from "../api/client";
import { AppearanceProvider, useAppearance } from "./appearance-context";
import { buildAccentPalette } from "./color-utils";

/**
 * jsdom has no real `matchMedia` implementation (it is simply `undefined`
 * by default, which is exactly what readColorScheme()'s own guard is
 * written to tolerate) — these tests install a controllable fake so the
 * scheme-aware accent derivation and the live OS-theme-change listener
 * can actually be exercised.
 */
function stubColorScheme(initialMatches: boolean) {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  const mediaQueryList = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue(mediaQueryList),
  );
  return {
    triggerChange: (matches: boolean) => {
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
}

const authContext = vi.hoisted(() => ({
  session: null as null | {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
    refreshExpiresAt: string;
    user: { id: string; email: string; displayName: string; isPlatformAdmin: boolean };
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isBootstrapping: false,
}));

vi.mock("../auth/auth-context", () => ({
  useAuth: () => authContext,
}));

const activeSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshExpiresAt: "2099-01-02T00:00:00.000Z",
  user: { id: "user-1", email: "ana@example.com", displayName: "Ana", isPlatformAdmin: false },
};

function wrapper({ children }: PropsWithChildren) {
  return <AppearanceProvider>{children}</AppearanceProvider>;
}

describe("AppearanceProvider", () => {
  afterEach(() => {
    authContext.session = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.cssText = "";
  });

  it("applies the default accent color and sidebar layout when there is no session", async () => {
    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.accentColor).toBe("#0070f2");
    expect(result.current.navigationLayout).toBe("sidebar");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#0070f2");
  });

  it("loads a real user's stored accent color and layout preference", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([
      { key: "ui.accentColor", value: "#7c3aed", updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "ui.navigationLayout", value: "navbar", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.accentColor).toBe("#7c3aed");
    expect(result.current.navigationLayout).toBe("navbar");
  });

  it("falls back to defaults when a stored preference is malformed", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([
      { key: "ui.accentColor", value: "not-a-hex-color", updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "ui.navigationLayout", value: "sideways", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.accentColor).toBe("#0070f2");
    expect(result.current.navigationLayout).toBe("sidebar");
  });

  it("applies and persists a new accent color, deriving the full CSS palette", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.accentColor",
      value: "#16794f",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setAccentColor("#16794f"));

    expect(result.current.accentColor).toBe("#16794f");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#16794f");
    expect(document.documentElement.style.getPropertyValue("--accent-hover")).not.toBe("");
    expect(document.documentElement.style.getPropertyValue("--accent-soft")).not.toBe("");
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith("access-token", "ui.accentColor", "#16794f"),
    );
  });

  it("ignores an invalid hex color instead of applying it", async () => {
    const setPreference = vi.spyOn(apiClient, "setUserPreference");
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setAccentColor("not-a-color"));

    expect(result.current.accentColor).toBe("#0070f2");
    expect(setPreference).not.toHaveBeenCalled();
  });

  it("persists a navigation layout change", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.navigationLayout",
      value: "navbar",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setNavigationLayout("navbar"));

    expect(result.current.navigationLayout).toBe("navbar");
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith("access-token", "ui.navigationLayout", "navbar"),
    );
  });

  it("surfaces a save error without reverting the value already applied locally", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    vi.spyOn(apiClient, "setUserPreference").mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setAccentColor("#dc2626"));

    expect(result.current.accentColor).toBe("#dc2626");
    await waitFor(() => expect(result.current.saveError).not.toBeNull());
  });

  it("loads a real user's stored custom surface color", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([
      { key: "ui.surfaceColor", value: "#0f172a", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.surfaceColor).toBe("#0f172a");
    expect(document.documentElement.style.getPropertyValue("--paper")).toBe("#0f172a");
    expect(document.documentElement.style.getPropertyValue("--nav-bg")).toBe("#0f172a");
  });

  it("ignores a malformed stored surface color and leaves it uncustomized", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([
      { key: "ui.surfaceColor", value: "not-a-hex-color", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.surfaceColor).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--paper")).toBe("");
  });

  it("applies and persists a custom surface color to the whole interface, not just the nav", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.surfaceColor",
      value: "#0f172a",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setSurfaceColor("#0f172a"));

    expect(result.current.surfaceColor).toBe("#0f172a");
    const style = document.documentElement.style;
    // The whole surface set — not only the nav-specific tokens.
    expect(style.getPropertyValue("--paper")).toBe("#0f172a");
    expect(style.getPropertyValue("--canvas")).not.toBe("");
    expect(style.getPropertyValue("--canvas")).not.toBe("#0f172a");
    expect(style.getPropertyValue("--ink")).not.toBe("");
    expect(style.getPropertyValue("--muted-strong")).not.toBe("");
    expect(style.getPropertyValue("--line")).not.toBe("");
    expect(style.getPropertyValue("--field")).not.toBe("");
    expect(style.getPropertyValue("--nav-bg")).toBe("#0f172a");
    expect(style.getPropertyValue("--nav-ink")).not.toBe("");
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith("access-token", "ui.surfaceColor", "#0f172a"),
    );
  });

  it("clears a custom surface color back to the theme default across every token it set", async () => {
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.surfaceColor",
      value: "auto",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setSurfaceColor("#0f172a"));
    expect(document.documentElement.style.getPropertyValue("--paper")).toBe("#0f172a");

    act(() => result.current.setSurfaceColor(null));

    expect(result.current.surfaceColor).toBeNull();
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--paper")).toBe("");
    expect(style.getPropertyValue("--canvas")).toBe("");
    expect(style.getPropertyValue("--ink")).toBe("");
    expect(style.getPropertyValue("--nav-bg")).toBe("");
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith("access-token", "ui.surfaceColor", "auto"),
    );
  });

  it("ignores an invalid hex when setting a surface color instead of applying it", async () => {
    const setPreference = vi.spyOn(apiClient, "setUserPreference");
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setSurfaceColor("not-a-color"));

    expect(result.current.surfaceColor).toBeNull();
    expect(setPreference).not.toHaveBeenCalled();
  });

  it("derives a dark-appropriate accent-soft when the OS is in dark mode — the real contrast bug this fixes", async () => {
    stubColorScheme(true);
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.accentColor",
      value: "#7c3aed",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setAccentColor("#7c3aed"));

    const expectedDark = buildAccentPalette("#7c3aed", "dark");
    const expectedLight = buildAccentPalette("#7c3aed", "light");
    expect(document.documentElement.style.getPropertyValue("--accent-soft")).toBe(
      expectedDark.accentSoft,
    );
    expect(expectedDark.accentSoft).not.toBe(expectedLight.accentSoft);
  });

  it("re-derives the accent palette live when the OS switches color scheme", async () => {
    const scheme = stubColorScheme(false);
    authContext.session = activeSession;
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.accentColor",
      value: "#0f8a5f",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setAccentColor("#0f8a5f"));
    const lightSoft = document.documentElement.style.getPropertyValue("--accent-soft");
    expect(lightSoft).toBe(buildAccentPalette("#0f8a5f", "light").accentSoft);

    act(() => scheme.triggerChange(true));

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--accent-soft")).toBe(
        buildAccentPalette("#0f8a5f", "dark").accentSoft,
      ),
    );
  });
});
