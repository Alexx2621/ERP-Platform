import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { apiClient } from "../api/client";
import { AuthProvider, useAuth } from "./auth-context";

const REFRESH_TOKEN_STORAGE_KEY = "erp.refreshToken";

const expiredSession = {
  accessToken: "expired-access",
  refreshToken: "refresh-1",
  accessExpiresAt: "2020-01-01T00:00:00.000Z",
  refreshExpiresAt: "2099-01-02T00:00:00.000Z",
  user: { id: "user-1", email: "ana@example.com", displayName: "Ana", isPlatformAdmin: false },
};

const refreshedSession = {
  ...expiredSession,
  accessToken: "fresh-access",
  refreshToken: "refresh-2",
  accessExpiresAt: "2099-01-01T00:00:00.000Z",
};

function wrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rotates an access token before an authenticated operation", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue(expiredSession);
    const refreshMock = vi.spyOn(apiClient, "refresh").mockResolvedValue(refreshedSession);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "ana@example.com", password: "Password1" });
    });

    let accessToken = "";
    await act(async () => {
      accessToken = await result.current.getAccessToken();
    });

    expect(refreshMock).toHaveBeenCalledWith("refresh-1");
    expect(accessToken).toBe("fresh-access");
    expect(result.current.session?.refreshToken).toBe("refresh-2");
  });

  it("clears the local session even if remote logout fails", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue(refreshedSession);
    vi.spyOn(apiClient, "logout").mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "ana@example.com", password: "Password1" });
    });
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.session).toBeNull();
  });

  it("coalesces concurrent token requests into one refresh rotation", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue(expiredSession);
    const refreshMock = vi.spyOn(apiClient, "refresh").mockResolvedValue(refreshedSession);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "ana@example.com", password: "Password1" });
    });

    let tokens: string[] = [];
    await act(async () => {
      tokens = await Promise.all([
        result.current.getAccessToken(),
        result.current.getAccessToken(),
        result.current.getAccessToken(),
      ]);
    });

    expect(refreshMock).toHaveBeenCalledOnce();
    expect(tokens).toEqual(["fresh-access", "fresh-access", "fresh-access"]);
  });

  it("clears the local session when refresh rotation fails", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue(expiredSession);
    vi.spyOn(apiClient, "refresh").mockRejectedValue(new Error("refresh rejected"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "ana@example.com", password: "Password1" });
    });

    await act(async () => {
      await expect(result.current.getAccessToken()).rejects.toThrow("refresh rejected");
    });
    expect(result.current.session).toBeNull();
  });

  it("persists the refresh token to sessionStorage after login, and clears it on logout", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue(refreshedSession);
    vi.spyOn(apiClient, "logout").mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "ana@example.com", password: "Password1" });
    });
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      refreshedSession.refreshToken,
    );

    await act(async () => {
      await result.current.logout();
    });
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("starts without bootstrapping when no refresh token was stored", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isBootstrapping).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("silently restores a session from a stored refresh token on mount", async () => {
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    const refreshMock = vi.spyOn(apiClient, "refresh").mockResolvedValue(refreshedSession);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isBootstrapping).toBe(true);

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(refreshMock).toHaveBeenCalledWith("refresh-1");
    expect(result.current.session).toEqual(refreshedSession);
  });

  it("clears a stale stored refresh token when the bootstrap refresh fails", async () => {
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-stale");
    vi.spyOn(apiClient, "refresh").mockRejectedValue(new Error("expired"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(result.current.session).toBeNull();
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
