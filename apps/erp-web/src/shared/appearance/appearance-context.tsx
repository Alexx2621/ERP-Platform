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
import { buildAccentPalette, buildSurfacePalette, isValidHexColor, type ColorScheme } from "./color-utils";

export type NavigationLayout = "sidebar" | "navbar";

const DEFAULT_ACCENT_COLOR = "#0070f2";
const DEFAULT_NAVIGATION_LAYOUT: NavigationLayout = "sidebar";

const ACCENT_COLOR_KEY = "ui.accentColor";
const NAVIGATION_LAYOUT_KEY = "ui.navigationLayout";
const SURFACE_COLOR_KEY = "ui.surfaceColor";
/** Persisted alongside a real hex value to mean "explicitly cleared, follow the theme default". */
const SURFACE_COLOR_AUTO = "auto";

interface AppearanceContextValue {
  accentColor: string;
  navigationLayout: NavigationLayout;
  /** null = not customized, the whole interface follows the theme's own light/dark surface colors. */
  surfaceColor: string | null;
  isReady: boolean;
  saveError: string | null;
  setAccentColor: (hex: string) => void;
  setNavigationLayout: (layout: NavigationLayout) => void;
  setSurfaceColor: (hex: string | null) => void;
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
  surfaceColor: null,
  isReady: true,
  saveError: null,
  setAccentColor: () => {},
  setNavigationLayout: () => {},
  setSurfaceColor: () => {},
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

const SURFACE_PROPERTIES = [
  "--canvas",
  "--paper",
  "--field",
  "--field-hover",
  "--ink",
  "--muted-strong",
  "--muted",
  "--line",
  "--line-strong",
  "--nav-bg",
  "--nav-ink",
  "--nav-muted",
  "--nav-line",
  "--nav-hover",
] as const;

/**
 * Applies (or clears) a custom base color for the *entire* interface —
 * canvas, cards, headers, inputs, borders and the nav chrome, since every
 * one of those already reads its color exclusively from this same token
 * set (see buildSurfacePalette's own docstring). Scheme-independent by
 * design, same reasoning as the accent color's own contrast derivation:
 * the chosen base's own luminance decides whether ink comes out light or
 * dark, regardless of whether the OS is in light or dark mode. Clearing
 * removes every inline override so the CSS theme defaults (light/dark
 * media query) take back over, rather than reapplying a hardcoded value.
 */
function applySurfaceColor(hex: string | null): void {
  const root = document.documentElement.style;
  if (!hex) {
    for (const property of SURFACE_PROPERTIES) {
      root.removeProperty(property);
    }
    return;
  }
  const palette = buildSurfacePalette(hex);
  root.setProperty("--canvas", palette.canvas);
  root.setProperty("--paper", palette.paper);
  root.setProperty("--field", palette.field);
  root.setProperty("--field-hover", palette.fieldHover);
  root.setProperty("--ink", palette.ink);
  root.setProperty("--muted-strong", palette.mutedStrong);
  root.setProperty("--muted", palette.muted);
  root.setProperty("--line", palette.line);
  root.setProperty("--line-strong", palette.lineStrong);
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
  const [surfaceColor, setSurfaceColorState] = useState<string | null>(null);
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
    applySurfaceColor(surfaceColor);
  }, [surfaceColor]);

  useEffect(() => {
    if (!session) {
      loadedForUserIdRef.current = null;
      setAccentColorState(DEFAULT_ACCENT_COLOR);
      setNavigationLayoutState(DEFAULT_NAVIGATION_LAYOUT);
      setSurfaceColorState(null);
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
        const storedSurfaceColor = preferences.find(
          (preference) => preference.key === SURFACE_COLOR_KEY,
        )?.value;
        if (typeof storedAccent === "string" && isValidHexColor(storedAccent)) {
          setAccentColorState(storedAccent);
        }
        if (storedLayout === "sidebar" || storedLayout === "navbar") {
          setNavigationLayoutState(storedLayout);
        }
        if (typeof storedSurfaceColor === "string" && isValidHexColor(storedSurfaceColor)) {
          setSurfaceColorState(storedSurfaceColor);
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

  const setSurfaceColor = useCallback(
    (hex: string | null) => {
      if (hex !== null && !isValidHexColor(hex)) {
        return;
      }
      setSurfaceColorState(hex);
      persist(SURFACE_COLOR_KEY, hex ?? SURFACE_COLOR_AUTO);
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      accentColor,
      navigationLayout,
      surfaceColor,
      isReady,
      saveError,
      setAccentColor,
      setNavigationLayout,
      setSurfaceColor,
    }),
    [
      accentColor,
      navigationLayout,
      surfaceColor,
      isReady,
      saveError,
      setAccentColor,
      setNavigationLayout,
      setSurfaceColor,
    ],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
