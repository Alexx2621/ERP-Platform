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
import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { buildAccentPalette, isValidHexColor } from "./color-utils";

export type NavigationLayout = "sidebar" | "navbar";

const DEFAULT_ACCENT_COLOR = "#0070f2";
const DEFAULT_NAVIGATION_LAYOUT: NavigationLayout = "sidebar";

const ACCENT_COLOR_KEY = "ui.accentColor";
const NAVIGATION_LAYOUT_KEY = "ui.navigationLayout";

interface AppearanceContextValue {
  accentColor: string;
  navigationLayout: NavigationLayout;
  isReady: boolean;
  saveError: string | null;
  setAccentColor: (hex: string) => void;
  setNavigationLayout: (layout: NavigationLayout) => void;
}

// Defaults to a real, working value (not null) — ProductShell reads this
// context on every page across the app, including the ~15 existing page
// tests that render it without wrapping in AppearanceProvider. Falling
// back to the same accent/sidebar defaults the app already shipped with
// keeps every one of those tests passing unmodified, unlike useAuth()
// (which intentionally throws — there is no safe default for "am I
// logged in"; there very much is one for "what color is the sidebar").
const DEFAULT_CONTEXT_VALUE: AppearanceContextValue = {
  accentColor: DEFAULT_ACCENT_COLOR,
  navigationLayout: DEFAULT_NAVIGATION_LAYOUT,
  isReady: true,
  saveError: null,
  setAccentColor: () => {},
  setNavigationLayout: () => {},
};

const AppearanceContext = createContext<AppearanceContextValue>(DEFAULT_CONTEXT_VALUE);

function applyAccentColor(hex: string): void {
  const palette = buildAccentPalette(hex);
  const root = document.documentElement.style;
  root.setProperty("--accent", palette.accent);
  root.setProperty("--accent-hover", palette.accentHover);
  root.setProperty("--accent-light", palette.accentLight);
  root.setProperty("--accent-soft", palette.accentSoft);
  root.setProperty("--accent-contrast", palette.accentContrast);
}

export function AppearanceProvider({ children }: PropsWithChildren) {
  const { session, getAccessToken } = useAuth();
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR);
  const [navigationLayout, setNavigationLayoutState] = useState<NavigationLayout>(
    DEFAULT_NAVIGATION_LAYOUT,
  );
  const [isReady, setIsReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!session) {
      loadedForUserIdRef.current = null;
      setAccentColorState(DEFAULT_ACCENT_COLOR);
      setNavigationLayoutState(DEFAULT_NAVIGATION_LAYOUT);
      setIsReady(true);
      return;
    }
    if (loadedForUserIdRef.current === session.user.id) {
      return;
    }
    loadedForUserIdRef.current = session.user.id;

    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const preferences = await apiClient.listUserPreferences(accessToken, controller.signal);
        const storedAccent = preferences.find((preference) => preference.key === ACCENT_COLOR_KEY)
          ?.value;
        const storedLayout = preferences.find(
          (preference) => preference.key === NAVIGATION_LAYOUT_KEY,
        )?.value;
        if (typeof storedAccent === "string" && isValidHexColor(storedAccent)) {
          setAccentColorState(storedAccent);
        }
        if (storedLayout === "sidebar" || storedLayout === "navbar") {
          setNavigationLayoutState(storedLayout);
        }
      } catch {
        // Keep defaults — the appearance page can still be used to set
        // preferences going forward even if the initial load failed.
      } finally {
        setIsReady(true);
      }
    })();

    return () => controller.abort();
  }, [session, getAccessToken]);

  const persist = useCallback(
    (key: string, value: string) => {
      void (async () => {
        try {
          const accessToken = await getAccessToken();
          await apiClient.setUserPreference(accessToken, key, value);
          setSaveError(null);
        } catch {
          setSaveError("No se pudo guardar la preferencia. Se aplicó solo para esta sesión.");
        }
      })();
    },
    [getAccessToken],
  );

  const setAccentColor = useCallback(
    (hex: string) => {
      if (!isValidHexColor(hex)) {
        return;
      }
      setAccentColorState(hex);
      persist(ACCENT_COLOR_KEY, hex);
    },
    [persist],
  );

  const setNavigationLayout = useCallback(
    (layout: NavigationLayout) => {
      setNavigationLayoutState(layout);
      persist(NAVIGATION_LAYOUT_KEY, layout);
    },
    [persist],
  );

  const value = useMemo(
    () => ({ accentColor, navigationLayout, isReady, saveError, setAccentColor, setNavigationLayout }),
    [accentColor, navigationLayout, isReady, saveError, setAccentColor, setNavigationLayout],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
