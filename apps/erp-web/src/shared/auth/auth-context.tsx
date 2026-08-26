import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { LoginInput, RegisterInput, SessionResponse } from "@erp/api-client";
import { apiClient } from "../api/client";

const EXPIRY_MARGIN_MS = 30_000;

interface AuthContextValue {
  session: SessionResponse | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenNeedsRefresh(session: SessionResponse): boolean {
  return new Date(session.accessExpiresAt).getTime() - EXPIRY_MARGIN_MS <= Date.now();
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const sessionRef = useRef<SessionResponse | null>(null);
  const refreshPromiseRef = useRef<Promise<SessionResponse> | null>(null);

  const replaceSession = useCallback((nextSession: SessionResponse | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

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
    () => ({ session, login, register, logout, getAccessToken }),
    [getAccessToken, login, logout, register, session],
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
