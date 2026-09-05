import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsOutSimple, DotsSixVertical, Plus, X } from "@phosphor-icons/react";
import type { TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { dashboardWidgets, type WidgetDefinition } from "./widget-definitions";
import { useDashboardData } from "./use-dashboard-data";

interface HomeDashboardSelection extends TenantSummary {
  companyId?: string;
}

interface HomeDashboardProps {
  selection: HomeDashboardSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

type WidgetSize = "normal" | "wide";

interface DashboardLayout {
  order: string[];
  hidden: string[];
  sizes: Record<string, WidgetSize>;
}

const LAYOUT_PREFERENCE_KEY = "ui.dashboardLayout";
const DEFAULT_ORDER = dashboardWidgets.map((widget) => widget.id);

function defaultLayout(): DashboardLayout {
  return { order: [...DEFAULT_ORDER], hidden: [], sizes: {} };
}

/**
 * Moves `draggedId` to `targetId`'s slot. A pure function — independently
 * unit-tested — so the drag/drop event handlers only need to compute the
 * target id and call it.
 *
 * Direction-aware on purpose: dragging forward (toward a later index)
 * inserts *after* the target, dragging backward inserts *before* it — both
 * land the dragged card in the target's original slot, shifting everything
 * between by one. A real bug found while writing this function's own
 * render test: always inserting "before" the target meant dragging a card
 * onto its immediate next neighbor removed it and reinserted it at the
 * exact same position — a silent no-op the drop placeholder still
 * animated for, with nothing actually changing.
 */
export function reorderWidgets(order: string[], draggedId: string, targetId: string): string[] {
  const draggedIndex = order.indexOf(draggedId);
  const targetIndex = order.indexOf(targetId);
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return order;
  const next = order.filter((id) => id !== draggedId);
  const targetIndexAfterRemoval = next.indexOf(targetId);
  const insertAt = draggedIndex < targetIndex ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
  next.splice(insertAt, 0, draggedId);
  return next;
}

/**
 * Merges a stored layout with the current widget registry: a widget added
 * to the registry after a user's layout was last saved still appears
 * (appended at the end, never hidden); a widget removed from the registry
 * is dropped silently rather than rendered as a broken tile.
 */
function reconcileLayout(stored: Partial<DashboardLayout> | null): DashboardLayout {
  const knownIds = new Set(DEFAULT_ORDER);
  const storedOrder = (stored?.order ?? []).filter((id) => knownIds.has(id));
  const missing = DEFAULT_ORDER.filter((id) => !storedOrder.includes(id));
  return {
    order: [...storedOrder, ...missing],
    hidden: (stored?.hidden ?? []).filter((id) => knownIds.has(id)),
    sizes: stored?.sizes ?? {},
  };
}

/**
 * The home dashboard's widget grid: reorder via native HTML5 drag-and-drop
 * (this codebase hand-rolls its interactive widgets — Modal/NavDropdown/Tabs
 * are all dependency-free — rather than adding a drag/grid library for one
 * screen), resize via a click-to-toggle button (a real pixel-drag resize
 * needs mouse-move tracking and grid-track math this feature doesn't need),
 * remove/re-add via an X and a small disclosure menu. The layout persists
 * through the same generic UserPreference store
 * (apps/erp-web/src/shared/appearance/appearance-context.tsx already proved
 * this exact load-once/persist-on-change pattern for Apariencia).
 *
 * Known gap, disclosed rather than hidden: native HTML5 drag-and-drop has
 * no built-in keyboard path. Resize and remove are both reachable by
 * keyboard (real buttons); reordering today is mouse-only.
 */
export function HomeDashboard({ selection, navigate }: HomeDashboardProps) {
  const { getAccessToken } = useAuth();
  const { data, isLoading } = useDashboardData(selection);
  const [layout, setLayout] = useState<DashboardLayout>(defaultLayout);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const loadedRef = useRef(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const preferences = await apiClient.listUserPreferences(accessToken, controller.signal);
        const stored = preferences.find((preference) => preference.key === LAYOUT_PREFERENCE_KEY)
          ?.value as Partial<DashboardLayout> | undefined;
        setLayout(reconcileLayout(stored ?? null));
      } catch {
        // Keep the default layout — the dashboard still works, it just
        // isn't personalized yet.
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

  const persist = useCallback(
    (next: DashboardLayout) => {
      void (async () => {
        try {
          const accessToken = await getAccessToken();
          await apiClient.setUserPreference(accessToken, LAYOUT_PREFERENCE_KEY, next);
        } catch {
          // Best-effort — the layout still applies for this session even
          // if saving it failed.
        }
      })();
    },
    [getAccessToken],
  );

  const updateLayout = useCallback(
    (updater: (current: DashboardLayout) => DashboardLayout) => {
      setLayout((current) => {
        const next = updater(current);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const visibleWidgets = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id) => dashboardWidgets.find((widget) => widget.id === id))
    .filter((widget): widget is WidgetDefinition => Boolean(widget));

  const hiddenWidgets = dashboardWidgets.filter((widget) => layout.hidden.includes(widget.id));

  function handleDrop(targetId: string) {
    if (!draggedId) return;
    updateLayout((current) => ({ ...current, order: reorderWidgets(current.order, draggedId, targetId) }));
    setDraggedId(null);
    setDropTargetId(null);
  }

  function toggleSize(id: string) {
    updateLayout((current) => ({
      ...current,
      sizes: { ...current.sizes, [id]: current.sizes[id] === "wide" ? "normal" : "wide" },
    }));
  }

  function removeWidget(id: string) {
    updateLayout((current) => ({ ...current, hidden: [...current.hidden, id] }));
  }

  function restoreWidget(id: string) {
    setAddMenuOpen(false);
    updateLayout((current) => ({ ...current, hidden: current.hidden.filter((hiddenId) => hiddenId !== id) }));
  }

  return (
    <div>
      {hiddenWidgets.length > 0 ? (
        <div ref={addMenuRef} className="relative mb-4 flex justify-end">
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
              className="absolute right-0 top-11 z-10 min-w-[220px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-[var(--shadow-md)]"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleWidgets.map((widget) => {
          const isDropTarget = dropTargetId === widget.id && draggedId !== null && draggedId !== widget.id;
          const size = layout.sizes[widget.id] ?? "normal";
          const content = widget.compute(data);

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={() => setDraggedId(widget.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDropTargetId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (widget.id !== draggedId) setDropTargetId(widget.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(widget.id);
              }}
              style={{ gridColumn: size === "wide" ? "span 2" : undefined }}
              className={`group relative rounded-[14px] border p-6 shadow-[var(--shadow-sm)] transition-opacity duration-150 ${
                draggedId === widget.id ? "opacity-40" : "opacity-100"
              } ${
                isDropTarget
                  ? "border-dashed border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--paper)]"
              }`}
            >
              {isDropTarget ? (
                <div className="flex h-full min-h-[110px] flex-col items-center justify-center gap-1 text-center">
                  <p className="text-[13px] font-extrabold text-[var(--accent-soft-text)]">Soltar aquí</p>
                  <p className="text-[11px] font-medium text-[var(--accent-soft-muted)]">
                    El widget ocupará esta posición
                  </p>
                </div>
              ) : (
                <>
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => toggleSize(widget.id)}
                      aria-label={`Cambiar tamaño de ${widget.title}`}
                      title="Cambiar tamaño"
                      className="grid size-7 place-items-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]"
                    >
                      <ArrowsOutSimple size={14} aria-hidden="true" />
                    </button>
                    <span
                      className="grid size-7 cursor-grab place-items-center rounded-[6px] text-[var(--muted)] active:cursor-grabbing"
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

                  <button
                    type="button"
                    onClick={() => navigate(widget.module)}
                    className="flex w-full flex-col items-start gap-4 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
                      <widget.icon size={19} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[var(--muted-strong)]">{widget.title}</p>
                      {isLoading && !content ? (
                        <div className="mt-2 h-8 w-24 animate-pulse rounded-[6px] bg-[var(--field-hover)]" />
                      ) : content ? (
                        <>
                          <p className="mt-1 truncate text-[26px] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
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
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
