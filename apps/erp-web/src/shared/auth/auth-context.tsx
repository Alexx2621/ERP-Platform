import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { LoginInput, RegisterInput, SessionResponse } from "@erp/api-client";
import { apiClient } from "../api/client";

const EXPIRY_MARGIN_MS = 30_000;
// Only the refresh token is persisted, and only in sessionStorage (cleared
// when the tab closes, never shared across tabs) — the access token itself
// stays in-memory only. This keeps the ADR-006 in-memory-token posture for
// the token that is actually sent on every request, while letting a page
// reload silently re-establish a session instead of forcing a fresh login.
const REFRESH_TOKEN_STORAGE_KEY = "erp.refreshToken";

interface AuthContextValue {
  session: SessionResponse | null;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenNeedsRefresh(session: SessionResponse): boolean {
  return new Date(session.accessExpiresAt).getTime() - EXPIRY_MARGIN_MS <= Date.now();
}

function readStoredRefreshToken(): string | null {
  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredRefreshToken(refreshToken: string | null): void {
  try {
    if (refreshToken) {
      window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    } else {
      window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (blocked by browser settings, private mode,
    // etc.) — the session still works for this tab, it just won't
    // survive a reload.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(() => readStoredRefreshToken() !== null);
  const sessionRef = useRef<SessionResponse | null>(null);
  const refreshPromiseRef = useRef<Promise<SessionResponse> | null>(null);

  const replaceSession = useCallback((nextSession: SessionResponse | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    writeStoredRefreshToken(nextSession?.refreshToken ?? null);
  }, []);

  useEffect(() => {
    const storedRefreshToken = readStoredRefreshToken();
    if (!storedRefreshToken) {
      return;
    }

    apiClient
      .refresh(storedRefreshToken)
      .then(replaceSession)
      .catch(() => writeStoredRefreshToken(null))
      .finally(() => setIsBootstrapping(false));
  }, [replaceSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      replaceSession(await apiClient.login(input));
    },
    [replaceSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      replaceSession(await apiClient.register(input));
    },
    [replaceSession],
  );

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      throw new Error("AUTH_SESSION_REQUIRED");
    }
    if (!tokenNeedsRefresh(current)) {
      return current.accessToken;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = apiClient.refresh(current.refreshToken);
    }

    try {
      const refreshed = await refreshPromiseRef.current;
      replaceSession(refreshed);
      return refreshed.accessToken;
    } catch (error) {
      replaceSession(null);
      throw error;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [replaceSession]);

  const logout = useCallback(async () => {
    const current = sessionRef.current;
    replaceSession(null);
    if (!current) {
      return;
    }

    try {
      await apiClient.logout(current.accessToken);
    } catch {
      // The local session is already cleared. Server-side expiry remains the fallback.
    }
  }, [replaceSession]);

  const value = useMemo(
    () => ({ session, isBootstrapping, login, register, logout, getAccessToken }),
    [getAccessToken, isBootstrapping, login, logout, register, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
