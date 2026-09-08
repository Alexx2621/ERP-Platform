import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowsOutSimple, DotsSixVertical, Plus, X } from "@phosphor-icons/react";
import ReactGridLayout, {
  WidthProvider,
  type Layout,
  type LayoutItem,
  type ResizeHandleAxis,
} from "react-grid-layout/legacy";
import type { TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { dashboardWidgets, type WidgetDefinition } from "./widget-definitions";
import { useDashboardData } from "./use-dashboard-data";

// Defined once at module scope — recreating WidthProvider(...) on every
// render would remount the whole grid (a well-documented react-grid-layout
// footgun), losing drag state and re-measuring the container each time.
const GridLayout = WidthProvider(ReactGridLayout);

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 32;
const GRID_MARGIN: [number, number] = [16, 16];
const PROFILE_COUNT = 3;
const PROFILES_PREFERENCE_KEY = "ui.dashboardProfiles";
/** The single-layout preference this dashboard used before profiles and
 * freeform grid placement existed — read once, on first load, to migrate
 * a real user's existing customization instead of silently discarding it. */
const LEGACY_LAYOUT_PREFERENCE_KEY = "ui.dashboardLayout";

interface HomeDashboardSelection extends TenantSummary {
  companyId?: string;
}

interface HomeDashboardProps {
  selection: HomeDashboardSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export interface WidgetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  hidden: string[];
  positions: Record<string, WidgetRect>;
}

interface DashboardProfilesState {
  activeProfile: number;
  profiles: Array<DashboardLayout | null>;
}

interface LegacyDashboardLayout {
  order?: string[];
  hidden?: string[];
  sizes?: Record<string, "normal" | "wide">;
}

const DEFAULT_ORDER = dashboardWidgets.map((widget) => widget.id);
const KNOWN_WIDGET_IDS = new Set(DEFAULT_ORDER);
const WIDGETS_BY_ID = new Map(dashboardWidgets.map((widget) => [widget.id, widget]));

function defaultSizeFor(widget: WidgetDefinition | undefined): { w: number; h: number } {
  return { w: widget?.defaultW ?? 4, h: widget?.defaultH ?? 4 };
}

function isValidRect(value: unknown): value is WidgetRect {
  if (!value || typeof value !== "object") return false;
  const rect = value as Partial<WidgetRect>;
  return (
    typeof rect.x === "number" &&
    typeof rect.y === "number" &&
    typeof rect.w === "number" &&
    typeof rect.h === "number" &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.w > 0 &&
    rect.h > 0 &&
    rect.x + rect.w <= GRID_COLS
  );
}

/** Exported for direct unit testing of the freeform-placement math. */
export function rectsOverlap(a: WidgetRect, b: WidgetRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Scans the grid row-major (top-to-bottom, left-to-right) for the first
 * `w`x`h` cell that overlaps none of `occupied`'s rects. Used both to seed
 * a brand-new profile's default reading-order layout (called once per
 * widget with everything placed so far as `occupied`) and to place a
 * restored/newly-registered widget without landing on top of another —
 * the one thing that must never happen, per the explicit "que no se
 * desborde o se vea feo" requirement.
 */
export function findFreeSlot(
  occupied: Record<string, WidgetRect>,
  w: number,
  h: number,
  cols: number = GRID_COLS,
): WidgetRect {
  const rects = Object.values(occupied);
  const maxY = rects.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      const candidate: WidgetRect = { x, y, w, h };
      if (!rects.some((rect) => rectsOverlap(candidate, rect))) return candidate;
    }
  }
  return { x: 0, y: maxY, w, h };
}

/**
 * Fills in whatever a stored layout is missing: an invalid/absent rect for
 * a known widget gets a real, collision-free position (this is what
 * produces a brand-new profile's initial packed layout, since every
 * widget starts with no stored rect); a widget no longer in the registry
 * is silently dropped rather than rendered as a broken tile. Free-slot
 * search only treats currently *visible* widgets as occupied — a hidden
 * widget's old spot isn't reserved on screen, so a newly-registered
 * widget lands wherever there's genuinely free room today.
 */
export function reconcileLayout(stored: DashboardLayout | null): DashboardLayout {
  const hidden = (stored?.hidden ?? []).filter((id) => KNOWN_WIDGET_IDS.has(id));
  const positions: Record<string, WidgetRect> = {};
  for (const id of DEFAULT_ORDER) {
    const rect = stored?.positions?.[id];
    if (isValidRect(rect)) positions[id] = rect;
  }
  const visibleOccupied: Record<string, WidgetRect> = {};
  for (const id of DEFAULT_ORDER) {
    if (!hidden.includes(id) && positions[id]) visibleOccupied[id] = positions[id];
  }
  for (const id of DEFAULT_ORDER) {
    if (positions[id]) continue;
    const { w, h } = defaultSizeFor(WIDGETS_BY_ID.get(id));
    const rect = findFreeSlot(visibleOccupied, w, h, GRID_COLS);
    positions[id] = rect;
    if (!hidden.includes(id)) visibleOccupied[id] = rect;
  }
  return { hidden, positions };
}

/**
 * One-time migration for a real, already-saved single-layout preference
 * from before profiles/freeform placement existed (`order` + `sizes`, no
 * x/y at all) — never discards a user's prior customization silently.
 * "wide" becomes an 8-column rect; everything else keeps its own default
 * size. Delegates to `reconcileLayout` at the end so a widget added to
 * the registry after that old layout was last saved still gets placed.
 */
export function migrateLegacyLayout(legacy: LegacyDashboardLayout): DashboardLayout {
  const order = (legacy.order ?? DEFAULT_ORDER).filter((id) => KNOWN_WIDGET_IDS.has(id));
  const hidden = (legacy.hidden ?? []).filter((id) => KNOWN_WIDGET_IDS.has(id));
  const positions: Record<string, WidgetRect> = {};
  const visibleOccupied: Record<string, WidgetRect> = {};
  for (const id of order) {
    const isWide = legacy.sizes?.[id] === "wide";
    const { w, h } = isWide ? { w: 8, h: 7 } : defaultSizeFor(WIDGETS_BY_ID.get(id));
    const rect = findFreeSlot(visibleOccupied, w, h, GRID_COLS);
    positions[id] = rect;
    if (!hidden.includes(id)) visibleOccupied[id] = rect;
  }
  return reconcileLayout({ hidden, positions });
}

function sanitizeStoredLayout(value: unknown): DashboardLayout | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DashboardLayout>;
  return {
    hidden: Array.isArray(candidate.hidden) ? candidate.hidden.filter((id): id is string => typeof id === "string") : [],
    positions:
      candidate.positions && typeof candidate.positions === "object"
        ? (candidate.positions as Record<string, WidgetRect>)
        : {},
  };
}

function sanitizeProfilesState(value: unknown): DashboardProfilesState {
  const candidate = (value ?? {}) as Partial<DashboardProfilesState>;
  const rawProfiles = Array.isArray(candidate.profiles) ? candidate.profiles : [];
  const profiles = Array.from({ length: PROFILE_COUNT }, (_, index) => sanitizeStoredLayout(rawProfiles[index]));
  const activeProfile =
    typeof candidate.activeProfile === "number" && candidate.activeProfile >= 0 && candidate.activeProfile < PROFILE_COUNT
      ? candidate.activeProfile
      : 0;
  return { activeProfile, profiles };
}

function emptyProfilesState(): DashboardProfilesState {
  return { activeProfile: 0, profiles: Array.from({ length: PROFILE_COUNT }, () => null) };
}

function WidgetIcon({ icon: Icon, color }: { icon: WidgetDefinition["icon"]; color: WidgetDefinition["color"] }) {
  const tileStyle = {
    "--tile-bg": `color-mix(in srgb, ${color} 16%, var(--paper))`,
    "--tile-fg": color,
  } as CSSProperties;
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-[var(--tile-bg,var(--accent-soft))] text-[var(--tile-fg,var(--accent-soft-text))]"
      style={tileStyle}
    >
      <Icon size={19} weight="duotone" aria-hidden="true" />
    </span>
  );
}

/**
 * Header for a rich (`render`-based) widget: icon + title, clickable only
 * when `widget.module` names a real place to go — a widget spanning
 * several modules (the activity feed) has no single destination, so its
 * header is plain text instead of a button that would navigate nowhere
 * meaningful.
 */
function WidgetHeader({
  widget,
  navigate,
}: {
  widget: WidgetDefinition;
  navigate: (path: AppPath) => void;
}) {
  const inner = (
    <>
      <WidgetIcon icon={widget.icon} color={widget.color} />
      <p className="text-[12.5px] font-bold text-[var(--muted-strong)]">{widget.title}</p>
    </>
  );
  if (!widget.module) {
    return <div className="flex items-center gap-3">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => navigate(widget.module!)}
      className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
    >
      {inner}
    </button>
  );
}

function renderResizeHandle(_axis: ResizeHandleAxis, ref: React.Ref<HTMLElement>) {
  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className="react-resizable-handle react-resizable-handle-se"
      aria-hidden="true"
    >
      <ArrowsOutSimple size={12} weight="bold" />
    </span>
  );
}

interface ProfileTabsProps {
  activeProfile: number;
  profiles: Array<DashboardLayout | null>;
  onSelect: (index: number) => void;
  onReset: (index: number) => void;
}

/**
 * Up to 3 saved arrangements — a fixed number of slots rather than an
 * open-ended "create profile" flow, per the explicit "hasta un maximo de
 * 3 perfiles" requirement. An empty slot (never customized) still selects
 * fine — it just falls back to the default packed layout, which then
 * becomes that slot's own saved layout the moment the user changes it.
 */
function ProfileTabs({ activeProfile, profiles, onSelect, onReset }: ProfileTabsProps) {
  return (
    <div role="tablist" aria-label="Perfiles del dashboard" className="flex items-center gap-1.5">
      {profiles.map((profile, index) => {
        const isActive = activeProfile === index;
        return (
          <div key={index} className="group/profile relative">
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(index)}
              className={`h-8 rounded-[7px] px-3 text-[12px] font-bold transition-colors duration-150 ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--muted-strong)] hover:bg-[var(--field-hover)]"
              }`}
            >
              Perfil {index + 1}
            </button>
            {profile ? (
              <button
                type="button"
                onClick={() => onReset(index)}
                aria-label={`Restablecer Perfil ${index + 1}`}
                title="Restablecer a la disposición predeterminada"
                className="absolute -right-1.5 -top-1.5 hidden size-4 place-items-center rounded-full bg-[var(--danger)] text-white group-hover/profile:grid"
              >
                <X size={9} weight="bold" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The home dashboard's widget grid: freeform drag/resize on a 12-column
 * grid via react-grid-layout (a hand-rolled linear reorder + wide/normal
 * toggle used to live here, but "el usuario debe poder tener la libertad
 * de ponerlos dónde quiera y con el tamaño que quiera" needs real x/y/w/h
 * placement and collision avoidance — reinventing that correctly, with
 * the exact overflow/overlap edge cases the request calls out, is what a
 * mature layout library is for). `preventCollision` + `compactType: null`
 * gives the two guarantees asked for at once: widgets can go anywhere
 * there's genuinely free space, including leaving gaps on purpose, and
 * they can never land on top of each other.
 *
 * Persists through the same generic UserPreference store already proven
 * by Apariencia, now holding up to 3 named slots
 * (`ui.dashboardProfiles`) instead of one — see `ProfileTabs`. A real,
 * previously-saved single-layout preference
 * (`ui.dashboardLayout`) is migrated into profile 1 on first load rather
 * than discarded.
 *
 * Known gap, disclosed rather than hidden: react-grid-layout drags via
 * mouse/touch (react-draggable), not native HTML5 DnD, and has no
 * built-in keyboard path for reordering — resize and remove stay
 * reachable by keyboard (real buttons), dragging today is pointer-only.
 */
export function HomeDashboard({ selection, navigate }: HomeDashboardProps) {
  const { getAccessToken } = useAuth();
  const { data, isLoading } = useDashboardData(selection);
  const [profilesState, setProfilesState] = useState<DashboardProfilesState>(emptyProfilesState);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const loadedRef = useRef(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const preferences = await apiClient.listUserPreferences(accessToken, controller.signal);
        // Only latch the guard once a request has genuinely gone through —
        // real, found-by-testing bug: marking it done *before* the fetch
        // even started meant React StrictMode's dev-only mount → cleanup →
        // remount cycle (which aborts this exact in-flight request) left
        // the guard permanently "already loaded" after an attempt that was
        // in fact aborted and never reached the server, so the real,
        // second (post-StrictMode) mount silently skipped fetching
        // forever — the dashboard rendered the *default* layout every
        // time, quietly discarding a saved one on every dev-mode reload.
        // Production is unaffected (StrictMode's double-invoke is
        // dev-only), but this is exactly the flow used to test saving and
        // reloading a layout locally, which is what surfaced it.
        loadedRef.current = true;
        const storedProfiles = preferences.find((preference) => preference.key === PROFILES_PREFERENCE_KEY)?.value;
        if (storedProfiles) {
          setProfilesState(sanitizeProfilesState(storedProfiles));
          return;
        }
        const legacy = preferences.find((preference) => preference.key === LEGACY_LAYOUT_PREFERENCE_KEY)?.value as
          | LegacyDashboardLayout
          | undefined;
        if (legacy) {
          setProfilesState({ activeProfile: 0, profiles: [migrateLegacyLayout(legacy), null, null] });
        }
      } catch {
        // An abort (StrictMode's synthetic cleanup, or a real navigation
        // away) must NOT latch the guard — only a genuine attempt that
        // reached the server (success or real failure) should. Leaving it
        // false here lets the next real mount try again for real.
        if (!controller.signal.aborted) loadedRef.current = true;
      }
    })();
    return () => controller.abort();
  }, [getAccessToken]);

  useEffect(() => {
    if (!addMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAddMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [addMenuOpen]);

  // A "latest ref" mirror of profilesState, kept in sync on every render —
  // real, found-by-testing bug: React (StrictMode's double-render, plus
  // useState's own eager-bailout precomputation) can invoke a functional
  // setState updater up to 3 times for one logical call. That's harmless
  // for a *pure* updater, but the previous version of updateLayout/
  // selectProfile/resetProfile called persist() — a real network side
  // effect — *inside* the updater, exactly the impurity React's own docs
  // warn against. Confirmed with a temporary stack-trace probe: one
  // profile-switch click fired persist() 3 times, and because those extra
  // invocations aren't guaranteed to all see the same "current" snapshot,
  // a stale write could land after — and silently overwrite — the real
  // one, even with the writes themselves correctly serialized (below).
  // Reading/writing profilesStateRef instead of a setState updater
  // guarantees each user action computes its own next state exactly once
  // and persists exactly once.
  const profilesStateRef = useRef<DashboardProfilesState>(profilesState);
  profilesStateRef.current = profilesState;

  // Every drag, resize, hide, restore, profile switch and reset fires its
  // own independent save. Chaining every write onto this same promise
  // still matters on top of the fix above: it guarantees the server only
  // ever processes these saves in the order they were made, so a save
  // that happens to take longer can never complete *after*, and clobber,
  // a save for a more recent action. `.catch(() => {})` keeps one failed
  // save from breaking the chain for every write after it.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback(
    (next: DashboardProfilesState) => {
      persistQueueRef.current = persistQueueRef.current.catch(() => {}).then(async () => {
        try {
          const accessToken = await getAccessToken();
          await apiClient.setUserPreference(accessToken, PROFILES_PREFERENCE_KEY, next);
        } catch {
          // Best-effort — the layout still applies for this session even
          // if saving it failed.
        }
      });
    },
    [getAccessToken],
  );

  const applyProfilesState = useCallback(
    (next: DashboardProfilesState) => {
      profilesStateRef.current = next;
      setProfilesState(next);
      persist(next);
    },
    [persist],
  );

  const updateLayout = useCallback(
    (updater: (current: DashboardLayout) => DashboardLayout) => {
      const current = profilesStateRef.current;
      const activeLayout = reconcileLayout(current.profiles[current.activeProfile]);
      const nextLayout = updater(activeLayout);
      if (nextLayout === activeLayout) return;
      const profiles = current.profiles.slice();
      profiles[current.activeProfile] = nextLayout;
      applyProfilesState({ ...current, profiles });
    },
    [applyProfilesState],
  );

  const selectProfile = useCallback(
    (index: number) => {
      const current = profilesStateRef.current;
      if (current.activeProfile === index) return;
      applyProfilesState({ ...current, activeProfile: index });
    },
    [applyProfilesState],
  );

  const resetProfile = useCallback(
    (index: number) => {
      const current = profilesStateRef.current;
      const profiles = current.profiles.slice();
      profiles[index] = null;
      applyProfilesState({ ...current, profiles });
    },
    [applyProfilesState],
  );

  const currentLayout = useMemo(
    () => reconcileLayout(profilesState.profiles[profilesState.activeProfile]),
    [profilesState],
  );

  const visibleWidgets = dashboardWidgets.filter((widget) => !currentLayout.hidden.includes(widget.id));
  const hiddenWidgets = dashboardWidgets.filter((widget) => currentLayout.hidden.includes(widget.id));

  const rglLayout: LayoutItem[] = visibleWidgets.map((widget) => {
    const rect = currentLayout.positions[widget.id] ?? { x: 0, y: 0, w: 4, h: 4 };
    return { i: widget.id, x: rect.x, y: rect.y, w: rect.w, h: rect.h, minW: 3, minH: 3 };
  });

  function handleLayoutChange(nextLayout: Layout) {
    updateLayout((current) => {
      let changed = false;
      const positions = { ...current.positions };
      for (const item of nextLayout) {
        const prev = positions[item.i];
        if (!prev || prev.x !== item.x || prev.y !== item.y || prev.w !== item.w || prev.h !== item.h) {
          positions[item.i] = { x: item.x, y: item.y, w: item.w, h: item.h };
          changed = true;
        }
      }
      return changed ? { ...current, positions } : current;
    });
  }

  function removeWidget(id: string) {
    updateLayout((current) => ({ ...current, hidden: [...current.hidden, id] }));
  }

  function restoreWidget(id: string) {
    setAddMenuOpen(false);
    updateLayout((current) => {
      const nextHidden = current.hidden.filter((hiddenId) => hiddenId !== id);
      const occupied: Record<string, WidgetRect> = {};
      for (const widgetId of DEFAULT_ORDER) {
        if (widgetId !== id && !nextHidden.includes(widgetId) && current.positions[widgetId]) {
          occupied[widgetId] = current.positions[widgetId];
        }
      }
      const stored = current.positions[id];
      const keepsStoredSpot = stored && !Object.values(occupied).some((rect) => rectsOverlap(stored, rect));
      const { w, h } = defaultSizeFor(WIDGETS_BY_ID.get(id));
      const rect = keepsStoredSpot ? stored! : findFreeSlot(occupied, stored?.w ?? w, stored?.h ?? h, GRID_COLS);
      return { hidden: nextHidden, positions: { ...current.positions, [id]: rect } };
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ProfileTabs
          activeProfile={profilesState.activeProfile}
          profiles={profilesState.profiles}
          onSelect={selectProfile}
          onReset={resetProfile}
        />
        {hiddenWidgets.length > 0 ? (
          <div ref={addMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
              className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] px-3 text-[12px] font-bold text-[var(--muted-strong)] transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--field-hover)]"
            >
              <Plus size={15} weight="bold" aria-hidden="true" />
              Agregar widget
            </button>
            {addMenuOpen ? (
              <div
                role="menu"
                aria-label="Agregar widget"
                className="fade-in-up absolute right-0 top-11 z-10 min-w-[220px] origin-top-right rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-[var(--shadow-md)]"
              >
                {hiddenWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    type="button"
                    role="menuitem"
                    onClick={() => restoreWidget(widget.id)}
                    className="flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2 text-left text-[13px] font-bold text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--field-hover)]"
                  >
                    <widget.icon size={16} aria-hidden="true" />
                    {widget.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <GridLayout
        className="layout"
        layout={rglLayout}
        cols={GRID_COLS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={[0, 0]}
        compactType={null}
        preventCollision
        isBounded
        draggableHandle=".widget-drag-handle"
        resizeHandles={["se"]}
        resizeHandle={renderResizeHandle}
        onLayoutChange={handleLayoutChange}
        onDragStart={(_layout, oldItem) => setDraggingId(oldItem?.i ?? null)}
        onDragStop={() => setDraggingId(null)}
        onResizeStart={(_layout, oldItem) => setResizingId(oldItem?.i ?? null)}
        onResizeStop={() => setResizingId(null)}
      >
        {visibleWidgets.map((widget) => {
          const content = widget.compute?.(data) ?? null;
          return (
            <div
              key={widget.id}
              className={`group relative overflow-hidden rounded-[14px] border p-6 shadow-[var(--shadow-sm)] transition-[opacity,box-shadow,border-color] duration-200 border-[var(--line)] bg-[var(--paper)] ${
                draggingId === widget.id || resizingId === widget.id ? "opacity-80" : "hover:shadow-[var(--shadow-md)]"
              }`}
            >
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <span
                  className="widget-drag-handle grid size-7 cursor-grab place-items-center rounded-[6px] text-[var(--muted)] active:cursor-grabbing"
                  aria-hidden="true"
                  title="Arrastrar para reordenar"
                >
                  <DotsSixVertical size={14} weight="bold" />
                </span>
                <button
                  type="button"
                  onClick={() => removeWidget(widget.id)}
                  aria-label={`Quitar ${widget.title}`}
                  title="Quitar"
                  className="grid size-7 place-items-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--field-hover)] hover:text-[var(--danger)]"
                >
                  <X size={14} weight="bold" aria-hidden="true" />
                </button>
              </div>

              {widget.render ? (
                <div className="flex h-full w-full flex-col gap-4 overflow-y-auto">
                  <WidgetHeader widget={widget} navigate={navigate} />
                  {widget.render(data, navigate)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => widget.module && navigate(widget.module)}
                  className="flex h-full w-full flex-col items-start gap-4 text-left"
                >
                  <WidgetIcon icon={widget.icon} color={widget.color} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-[var(--muted-strong)]">{widget.title}</p>
                    {isLoading && !content ? (
                      <div className="shimmer mt-2 h-8 w-24 rounded-[6px]" />
                    ) : content ? (
                      <>
                        <p
                          className="mt-1 truncate text-[26px] font-extrabold tracking-[-0.02em]"
                          style={{ color: widget.color }}
                        >
                          {content.value}
                        </p>
                        <p className="mt-1 truncate text-[11.5px] font-medium text-[var(--muted)]">
                          {content.caption}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-[12px] font-semibold text-[var(--muted)]">No disponible</p>
                    )}
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
