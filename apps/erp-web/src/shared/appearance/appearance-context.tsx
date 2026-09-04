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
import { buildAccentPalette, buildNavPalette, isValidHexColor, type ColorScheme } from "./color-utils";

export type NavigationLayout = "sidebar" | "navbar";

const DEFAULT_ACCENT_COLOR = "#0070f2";
const DEFAULT_NAVIGATION_LAYOUT: NavigationLayout = "sidebar";

const ACCENT_COLOR_KEY = "ui.accentColor";
const NAVIGATION_LAYOUT_KEY = "ui.navigationLayout";
const NAV_BACKGROUND_KEY = "ui.navBackground";
/** Persisted alongside a real hex value to mean "explicitly cleared, follow the theme default". */
const NAV_BACKGROUND_AUTO = "auto";

interface AppearanceContextValue {
  accentColor: string;
  navigationLayout: NavigationLayout;
  /** null = not customized, sidebar/navbar follow the theme's own surface color (light or dark). */
  navBackground: string | null;
  isReady: boolean;
  saveError: string | null;
  setAccentColor: (hex: string) => void;
  setNavigationLayout: (layout: NavigationLayout) => void;
  setNavBackground: (hex: string | null) => void;
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
  navBackground: null,
  isReady: true,
  saveError: null,
  setAccentColor: () => {},
  setNavigationLayout: () => {},
  setNavBackground: () => {},
};

const AppearanceContext = createContext<AppearanceContextValue>(DEFAULT_CONTEXT_VALUE);

function readColorScheme(): ColorScheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applies the derived accent palette as inline CSS custom properties.
 * Scheme-aware: see color-utils.ts's buildAccentPalette docstring for why
 * — using the same light-leaning math regardless of light/dark mode was a
 * real bug (a custom accent's "soft" tint stayed light even in dark mode,
 * where --ink is a near-white color, making text on it unreadable).
 */
function applyAccentColor(hex: string, scheme: ColorScheme): void {
  const palette = buildAccentPalette(hex, scheme);
  const root = document.documentElement.style;
  root.setProperty("--accent", palette.accent);
  root.setProperty("--accent-hover", palette.accentHover);
  root.setProperty("--accent-light", palette.accentLight);
  root.setProperty("--accent-soft", palette.accentSoft);
  root.setProperty("--accent-contrast", palette.accentContrast);
}

/**
 * Applies (or clears) a custom sidebar/navbar background. Unlike the
 * accent color, this is scheme-independent by design — the whole point is
 * letting a user run e.g. a dark sidebar regardless of whether the rest
 * of the theme is light or dark, the same way the reference product
 * screenshot the user shared does with its own separate "Fondo de
 * navegación" swatches. Clearing removes the inline overrides entirely so
 * the CSS defaults (--nav-bg: var(--paper), etc. — already theme-aware)
 * take back over, rather than reapplying some other hardcoded value.
 */
function applyNavBackground(hex: string | null): void {
  const root = document.documentElement.style;
  if (!hex) {
    root.removeProperty("--nav-bg");
    root.removeProperty("--nav-ink");
    root.removeProperty("--nav-muted");
    root.removeProperty("--nav-line");
    root.removeProperty("--nav-hover");
    return;
  }
  const palette = buildNavPalette(hex);
  root.setProperty("--nav-bg", palette.navBg);
  root.setProperty("--nav-ink", palette.navInk);
  root.setProperty("--nav-muted", palette.navMuted);
  root.setProperty("--nav-line", palette.navLine);
  root.setProperty("--nav-hover", palette.navHover);
}

export function AppearanceProvider({ children }: PropsWithChildren) {
  const { session, getAccessToken } = useAuth();
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR);
  const [navigationLayout, setNavigationLayoutState] = useState<NavigationLayout>(
    DEFAULT_NAVIGATION_LAYOUT,
  );
  const [navBackground, setNavBackgroundState] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(readColorScheme);
  const [isReady, setIsReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setColorScheme(event.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyAccentColor(accentColor, colorScheme);
  }, [accentColor, colorScheme]);

  useEffect(() => {
    applyNavBackground(navBackground);
  }, [navBackground]);

  useEffect(() => {
    if (!session) {
      loadedForUserIdRef.current = null;
      setAccentColorState(DEFAULT_ACCENT_COLOR);
      setNavigationLayoutState(DEFAULT_NAVIGATION_LAYOUT);
      setNavBackgroundState(null);
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
        const storedNavBackground = preferences.find(
          (preference) => preference.key === NAV_BACKGROUND_KEY,
        )?.value;
        if (typeof storedAccent === "string" && isValidHexColor(storedAccent)) {
          setAccentColorState(storedAccent);
        }
        if (storedLayout === "sidebar" || storedLayout === "navbar") {
          setNavigationLayoutState(storedLayout);
        }
        if (typeof storedNavBackground === "string" && isValidHexColor(storedNavBackground)) {
          setNavBackgroundState(storedNavBackground);
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

  const setNavBackground = useCallback(
    (hex: string | null) => {
      if (hex !== null && !isValidHexColor(hex)) {
        return;
      }
      setNavBackgroundState(hex);
      persist(NAV_BACKGROUND_KEY, hex ?? NAV_BACKGROUND_AUTO);
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      accentColor,
      navigationLayout,
      navBackground,
      isReady,
      saveError,
      setAccentColor,
      setNavigationLayout,
      setNavBackground,
    }),
    [
      accentColor,
      navigationLayout,
      navBackground,
      isReady,
      saveError,
      setAccentColor,
      setNavigationLayout,
      setNavBackground,
    ],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
