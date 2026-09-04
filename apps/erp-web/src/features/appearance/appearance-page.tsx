import { ArrowLeft, Check, RowsPlusBottom, SidebarSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { TenantSummary } from "@erp/api-client";
import { useAppearance, type NavigationLayout } from "../../shared/appearance/appearance-context";
import { isValidHexColor } from "../../shared/appearance/color-utils";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { ProductShell } from "../workspace/product-shell";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface AppearancePageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

const COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Azul", hex: "#0070f2" },
  { label: "Verde", hex: "#0f8a5f" },
  { label: "Púrpura", hex: "#7c3aed" },
  { label: "Naranja", hex: "#e8720c" },
  { label: "Rojo", hex: "#dc2626" },
  { label: "Pizarra", hex: "#334155" },
  { label: "Turquesa", hex: "#0d9488" },
  { label: "Rosa", hex: "#db2777" },
];

const LAYOUT_OPTIONS: {
  value: NavigationLayout;
  title: string;
  description: string;
  icon: typeof SidebarSimple;
}[] = [
  {
    value: "sidebar",
    title: "Barra lateral",
    description: "Menú de módulos fijo a la izquierda, agrupado por categoría. Recomendado para pantallas anchas.",
    icon: SidebarSimple,
  },
  {
    value: "navbar",
    title: "Barra superior",
    description:
      "Los módulos se agrupan por categoría en menús desplegables sobre una barra superior, dejando toda la pantalla libre para el contenido.",
    icon: RowsPlusBottom,
  },
];

export function AppearancePage({ selection, navigate }: AppearancePageProps) {
  const { accentColor, navigationLayout, setAccentColor, setNavigationLayout, saveError, isReady } =
    useAppearance();
  const [hexInput, setHexInput] = useState(accentColor);
  const [hexError, setHexError] = useState<string | null>(null);

  useEffect(() => {
    setHexInput(accentColor);
  }, [accentColor]);

  const commitHexInput = () => {
    const trimmed = hexInput.trim();
    const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!isValidHexColor(normalized)) {
      setHexError("Usa un color hexadecimal válido, por ejemplo #0070F2.");
      return;
    }
    setHexError(null);
    setAccentColor(normalized);
  };

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Apariencia"
      description="Personaliza el color de acento y la forma en que navegas entre módulos. Los cambios se aplican de inmediato y se guardan en tu cuenta."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      {saveError ? (
        <div className="mb-6">
          <ErrorNotice message={saveError} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Color de acento</h2>
          <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-[var(--muted-strong)]">
            Se usa en botones principales, enlaces activos y resaltados en toda la plataforma.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <label className="relative shrink-0">
              <span className="sr-only">Elegir color personalizado</span>
              <input
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="size-12 cursor-pointer rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] p-1"
              />
            </label>
            <div className="flex-1">
              <label className="grid gap-1.5" htmlFor="accent-hex-input">
                <span className="text-[12px] font-bold text-[var(--ink)]">Código hexadecimal</span>
                <input
                  id="accent-hex-input"
                  type="text"
                  value={hexInput}
                  onChange={(event) => setHexInput(event.target.value)}
                  onBlur={commitHexInput}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitHexInput();
                    }
                  }}
                  spellCheck={false}
                  aria-invalid={Boolean(hexError)}
                  aria-describedby={hexError ? "accent-hex-error" : undefined}
                  className="h-10 w-full rounded-[8px] border border-[var(--line-strong)] bg-[var(--field)] px-3 font-mono text-[13px] font-semibold uppercase text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                />
              </label>
              {hexError ? (
                <span id="accent-hex-error" role="alert" className="mt-1 block text-[11px] font-semibold text-[var(--danger)]">
                  {hexError}
                </span>
              ) : null}
            </div>
          </div>

          <p className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            Colores sugeridos
          </p>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
            {COLOR_PRESETS.map((preset) => {
              const selected = preset.hex.toLowerCase() === accentColor.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setAccentColor(preset.hex)}
                  title={preset.label}
                  aria-label={`Usar color ${preset.label}`}
                  aria-pressed={selected}
                  className="grid aspect-square place-items-center rounded-[9px] ring-1 ring-inset ring-[var(--line)] transition-transform duration-150 hover:scale-105"
                  style={{ backgroundColor: preset.hex }}
                >
                  {selected ? <Check size={16} weight="bold" color="#ffffff" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Diseño de navegación</h2>
          <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-[var(--muted-strong)]">
            Elige cómo quieres moverte entre los módulos de la plataforma.
          </p>

          <div className="mt-5 grid gap-3">
            {LAYOUT_OPTIONS.map((option) => {
              const selected = navigationLayout === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNavigationLayout(option.value)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3.5 rounded-[10px] border p-4 text-left transition-colors duration-150 ${
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--field-hover)]"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-[9px] ${
                      selected
                        ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                        : "bg-[var(--field-hover)] text-[var(--muted-strong)]"
                    }`}
                  >
                    <option.icon size={19} weight="bold" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13.5px] font-extrabold text-[var(--ink)]">{option.title}</span>
                      {selected ? (
                        <Check size={15} weight="bold" className="text-[var(--accent)]" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {navigationLayout === "navbar" ? (
            <p className="mt-4 text-[11.5px] font-medium leading-5 text-[var(--muted)]">
              En pantallas angostas la barra superior sigue mostrando el menú lateral deslizante, ya
              que hay demasiadas categorías para caber en una sola fila.
            </p>
          ) : null}
        </section>
      </div>

      {!isReady ? (
        <p className="mt-4 text-[11px] font-semibold text-[var(--muted)]">
          Cargando tus preferencias guardadas…
        </p>
      ) : null}
    </ProductShell>
  );
}
