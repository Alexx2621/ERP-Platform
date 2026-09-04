import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { apiClient } from "../api/client";
import { AppearanceProvider, useAppearance } from "./appearance-context";

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
});
