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

const ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: "Azul", hex: "#0070f2" },
  { label: "Verde", hex: "#0f8a5f" },
  { label: "Púrpura", hex: "#7c3aed" },
  { label: "Naranja", hex: "#e8720c" },
  { label: "Rojo", hex: "#dc2626" },
  { label: "Pizarra", hex: "#334155" },
  { label: "Turquesa", hex: "#0d9488" },
  { label: "Rosa", hex: "#db2777" },
];

// A separate, deliberately dark-leaning preset list for the navigation
// surface — customizing it is meant for the common "dark sidebar over an
// otherwise light app" pattern, kept fully independent from the accent
// color so picking a bold accent never accidentally breaks contrast on
// the nav chrome (the real bug this whole picker exists to prevent).
const NAV_BACKGROUND_PRESETS: { label: string; hex: string }[] = [
  { label: "Pizarra oscura", hex: "#0f172a" },
  { label: "Carbón", hex: "#18181b" },
  { label: "Púrpura oscuro", hex: "#241b3d" },
  { label: "Verde bosque", hex: "#0f291f" },
  { label: "Vino", hex: "#2c1414" },
  { label: "Blanco", hex: "#ffffff" },
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
    description:
      "Menú vertical, controlable y siempre visible en escritorio, agrupado por categoría. En teléfonos se conserva el menú lateral para que todas las opciones sigan siendo accesibles.",
    icon: SidebarSimple,
  },
  {
    value: "navbar",
    title: "Barra superior",
    description:
      "Más ancho para expedientes, tablas y reportes: los módulos se agrupan en menús desplegables sobre una barra superior, dejando toda la pantalla libre para el contenido.",
    icon: RowsPlusBottom,
  },
];

interface ColorPickerFieldProps {
  idPrefix: string;
  label: string;
  helpText: string;
  value: string;
  presets: { label: string; hex: string }[];
  onChange: (hex: string) => void;
  /** When set, shows a link to clear the customization back to the theme default. */
  onReset?: () => void;
  isCustomized?: boolean;
}

function ColorPickerField({
  idPrefix,
  label,
  helpText,
  value,
  presets,
  onChange,
  onReset,
  isCustomized,
}: ColorPickerFieldProps) {
  const [hexInput, setHexInput] = useState(value);
  const [hexError, setHexError] = useState<string | null>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const commitHexInput = () => {
    const trimmed = hexInput.trim();
    const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!isValidHexColor(normalized)) {
      setHexError("Usa un color hexadecimal válido, por ejemplo #0070F2.");
      return;
    }
    setHexError(null);
    onChange(normalized);
  };

  const hexInputId = `${idPrefix}-hex-input`;
  const errorId = `${idPrefix}-hex-error`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-extrabold text-[var(--ink)]">{label}</p>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            disabled={!isCustomized}
            className="text-[11px] font-bold text-[var(--accent)] underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed disabled:text-[var(--muted)] disabled:no-underline"
          >
            Usar tema predeterminado
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[11.5px] font-medium leading-5 text-[var(--muted-strong)]">{helpText}</p>

      <div className="mt-3 flex items-center gap-3">
        <label className="relative shrink-0">
          <span className="sr-only">Elegir color personalizado para {label.toLowerCase()}</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="size-11 cursor-pointer rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] p-1"
          />
        </label>
        <div className="flex-1">
          <label className="grid gap-1.5" htmlFor={hexInputId}>
            <span className="sr-only">Código hexadecimal para {label.toLowerCase()}</span>
            <input
              id={hexInputId}
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
              aria-describedby={hexError ? errorId : undefined}
              className="h-10 w-full rounded-[8px] border border-[var(--line-strong)] bg-[var(--field)] px-3 font-mono text-[13px] font-semibold uppercase text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
          {hexError ? (
            <span id={errorId} role="alert" className="mt-1 block text-[11px] font-semibold text-[var(--danger)]">
              {hexError}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2">
        {presets.map((preset) => {
          const selected = preset.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              onClick={() => onChange(preset.hex)}
              title={preset.label}
              aria-label={`Usar color ${preset.label} para ${label.toLowerCase()}`}
              aria-pressed={selected}
              className="grid aspect-square place-items-center rounded-[8px] ring-1 ring-inset ring-[var(--line)] transition-transform duration-150 hover:scale-105"
              style={{ backgroundColor: preset.hex }}
            >
              {selected ? (
                <Check
                  size={14}
                  weight="bold"
                  color={preset.hex.toLowerCase() === "#ffffff" ? "#101820" : "#ffffff"}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppearancePage({ selection, navigate }: AppearancePageProps) {
  const {
    accentColor,
    navigationLayout,
    navBackground,
    setAccentColor,
    setNavigationLayout,
    setNavBackground,
    saveError,
    isReady,
  } = useAppearance();

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Apariencia"
      description="Personaliza los colores de la interfaz y la forma en que navegas entre módulos. Los cambios se aplican de inmediato y se guardan en tu cuenta."
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

      <div className="grid gap-6">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Estructura de navegación</h2>
          <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-[var(--muted-strong)]">
            Elige cómo quieres moverte entre los módulos de la plataforma.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
        </section>

        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Colores de interfaz</h2>
          <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-[var(--muted-strong)]">
            El color principal se usa en acciones y selección. El fondo de navegación es
            independiente, para que puedas oscurecer el menú sin afectar el contraste del resto de
            la plataforma.
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ColorPickerField
              idPrefix="accent"
              label="Color principal"
              helpText="Botones principales, enlaces activos y resaltados en toda la plataforma."
              value={accentColor}
              presets={ACCENT_PRESETS}
              onChange={setAccentColor}
            />
            <ColorPickerField
              idPrefix="nav-bg"
              label="Fondo de navegación"
              helpText="Color de fondo del menú de módulos, independiente del color principal."
              value={navBackground ?? "#ffffff"}
              presets={NAV_BACKGROUND_PRESETS}
              onChange={setNavBackground}
              onReset={() => setNavBackground(null)}
              isCustomized={navBackground !== null}
            />
          </div>

          {navigationLayout === "navbar" ? (
            <p className="mt-6 border-t border-[var(--line)] pt-4 text-[11.5px] font-medium leading-5 text-[var(--muted)]">
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
