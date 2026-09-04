import {
  ArrowsClockwise,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CustomerResponse, ProductResponse } from "@erp/api-client";
import { useAuth } from "../../shared/auth/auth-context";
import { apiClient } from "../../shared/api/client";
import type { AppPath } from "../../shared/navigation/router";

interface CommandPaletteSelection {
  slug: string;
  companyId?: string;
}

interface CommandPaletteProps {
  selection: CommandPaletteSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
  isPlatformAdmin: boolean;
}

interface ModuleEntry {
  id: string;
  label: string;
  path: AppPath;
  keywords: string;
}

// Keywords are aliases a user might type instead of the module's own label —
// e.g. typing "productos" should still surface Catálogo, since that is where
// products actually live.
const MODULES: readonly ModuleEntry[] = [
  { id: "workspace", label: "Workspace", path: "/workspace", keywords: "inicio home" },
  {
    id: "roles",
    label: "Roles y permisos",
    path: "/roles",
    keywords: "rbac usuarios miembros invitar asignar",
  },
  {
    id: "settings",
    label: "Ajustes",
    path: "/settings",
    keywords: "configuracion moneda idioma zona horaria preferencias",
  },
  { id: "apps", label: "Apps", path: "/apps", keywords: "modulos plugins habilitar deshabilitar" },
  {
    id: "catalog",
    label: "Catálogo",
    path: "/catalog",
    keywords: "productos unidades categorias marcas variantes",
  },
  {
    id: "contacts",
    label: "Contactos",
    path: "/contacts",
    keywords: "clientes proveedores customers suppliers",
  },
  {
    id: "commercial",
    label: "Comercial",
    path: "/commercial",
    keywords: "impuestos bodegas precios taxes warehouses pricing listas de precios",
  },
  {
    id: "inventory",
    label: "Inventario",
    path: "/inventory",
    keywords: "existencias movimientos reservas transferencias stock",
  },
  { id: "sales", label: "Ventas", path: "/sales", keywords: "cotizaciones pedidos devoluciones pagos" },
  {
    id: "purchasing",
    label: "Compras",
    path: "/purchasing",
    keywords: "ordenes de compra recepciones facturas de proveedor",
  },
  { id: "pos", label: "Punto de venta", path: "/pos", keywords: "cajas turnos ventas pos" },
  {
    id: "commerce",
    label: "Comercio",
    path: "/commerce",
    keywords: "tiendas storefront pedidos online e-commerce",
  },
  {
    id: "accounting",
    label: "Contabilidad",
    path: "/accounting",
    keywords: "cuentas periodos fiscales asientos balance de comprobacion",
  },
  { id: "crm", label: "CRM", path: "/crm", keywords: "prospectos pipelines oportunidades actividades leads" },
  {
    id: "manufacturing",
    label: "Manufactura",
    path: "/manufacturing",
    keywords: "listas de materiales ordenes de produccion bom",
  },
  { id: "tenants", label: "Cambiar espacio", path: "/tenants", keywords: "tenant empresa switch" },
] as const;

const PLATFORM_MODULE: ModuleEntry = {
  id: "platform-admin",
  label: "Plataforma",
  path: "/platform-admin",
  keywords: "administracion usuarios plataforma",
};

const MODULE_RESULT_LIMIT = 6;
const ENTITY_RESULT_LIMIT = 6;

// Combining Diacritical Marks block (U+0300-U+036F). Built from numeric char
// codes rather than a literal escape sequence so the source file never
// embeds an invisible combining character of its own.
const COMBINING_DIACRITICS_PATTERN = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS_PATTERN, "");
}

type ResultKind = "module" | "product" | "customer";

interface PaletteResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

type EntitiesStatus = "idle" | "loading" | "loaded" | "error";

export function CommandPalette({ selection, navigate, isPlatformAdmin }: CommandPaletteProps) {
  const { getAccessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [entitiesStatus, setEntitiesStatus] = useState<EntitiesStatus>("idle");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedEntitiesRef = useRef(false);
  const listboxId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Global Ctrl+K / Cmd+K toggle — the only such shortcut in this app today.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent<HTMLElement> | globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown as EventListener);
    return () => window.removeEventListener("keydown", onKeyDown as EventListener);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const modules = useMemo(
    () => (isPlatformAdmin ? [...MODULES, PLATFORM_MODULE] : MODULES),
    [isPlatformAdmin],
  );

  // Products/customers are fetched at most once per mounted instance (this
  // component is remounted, via a `key`, whenever the active company
  // changes — see App()), and only once the user actually starts typing, so
  // opening the palette purely to navigate never triggers a network call.
  const loadEntities = useCallback(async () => {
    if (!selection.companyId) {
      return;
    }
    setEntitiesStatus("loading");
    try {
      const accessToken = await getAccessToken();
      const [productList, customerList] = await Promise.all([
        apiClient.listProducts(accessToken, selection.slug, selection.companyId),
        apiClient.listCustomers(accessToken, selection.slug, selection.companyId),
      ]);
      setProducts(productList);
      setCustomers(customerList);
      setEntitiesStatus("loaded");
    } catch {
      setEntitiesStatus("error");
    }
  }, [getAccessToken, selection.companyId, selection.slug]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim() && !hasFetchedEntitiesRef.current && selection.companyId) {
      hasFetchedEntitiesRef.current = true;
      void loadEntities();
    }
  }

  const trimmedQuery = query.trim();

  const results = useMemo<PaletteResult[]>(() => {
    const needle = normalize(trimmedQuery);

    // Modules like Punto de venta deliberately alias "ventas" in their own
    // keywords (a cashier persona searching "ventas" should still find it),
    // which can otherwise tie with the Ventas module itself on plain array
    // order. Rank a match on the module's own label above a match that only
    // hits its keyword aliases, so the more literal result always sorts
    // first regardless of declaration order.
    function moduleMatchRank(mod: ModuleEntry): number {
      const label = normalize(mod.label);
      if (label === needle) {
        return 0;
      }
      if (label.startsWith(needle)) {
        return 1;
      }
      if (label.includes(needle)) {
        return 2;
      }
      return 3;
    }

    const matchingModules = modules
      .filter((mod) => !needle || normalize(`${mod.label} ${mod.keywords}`).includes(needle))
      .slice()
      .sort((a, b) => moduleMatchRank(a) - moduleMatchRank(b));
    // With no query, show every module (there are only ~16) so this doubles
    // as a full navigation menu; once the user is filtering, cap the list so
    // module hits don't crowd out product/customer results below them.
    const moduleResults: PaletteResult[] = (needle
      ? matchingModules.slice(0, MODULE_RESULT_LIMIT)
      : matchingModules
    ).map((mod) => ({
        kind: "module" as const,
        id: `module-${mod.id}`,
        title: mod.label,
        subtitle: "Módulo",
        onSelect: () => {
          navigate(mod.path);
          close();
        },
      }));

    if (!needle) {
      return moduleResults;
    }

    const productResults: PaletteResult[] = products
      .filter((product) => normalize(`${product.code} ${product.name}`).includes(needle))
      .slice(0, ENTITY_RESULT_LIMIT)
      .map((product) => ({
        kind: "product" as const,
        id: `product-${product.id}`,
        title: product.name,
        subtitle: `Producto · ${product.code} · Ir a Catálogo`,
        onSelect: () => {
          navigate("/catalog");
          close();
        },
      }));

    const customerResults: PaletteResult[] = customers
      .filter((customer) =>
        normalize(`${customer.code} ${customer.name} ${customer.email ?? ""}`).includes(needle),
      )
      .slice(0, ENTITY_RESULT_LIMIT)
      .map((customer) => ({
        kind: "customer" as const,
        id: `customer-${customer.id}`,
        title: customer.name,
        subtitle: `Cliente · ${customer.code} · Ir a Contactos`,
        onSelect: () => {
          navigate("/contacts");
          close();
        },
      }));

    return [...moduleResults, ...productResults, ...customerResults];
  }, [close, customers, modules, navigate, products, trimmedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length, trimmedQuery]);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[activeIndex]?.onSelect();
    }
  }

  const activeResultId = results[activeIndex]?.id;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2.5 text-[12px] font-extrabold text-[var(--muted-strong)] shadow-[0_10px_30px_rgba(10,20,16,0.16)] transition-colors duration-150 hover:bg-[var(--field-hover)] hover:text-[var(--ink)]"
        aria-label="Abrir buscador (Ctrl+K)"
      >
        <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
        Buscar
        <kbd className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--field)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--muted)]">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
        aria-label="Buscar en la plataforma"
        className="m-auto mt-[12dvh] w-[calc(100%-2rem)] max-w-xl rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper)] p-0 text-[var(--ink)] shadow-[0_24px_80px_rgba(10,20,16,0.24)] backdrop:bg-[var(--overlay)] backdrop:backdrop-blur-[2px]"
      >
        <div onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="shrink-0 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeResultId}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Buscar módulos, productos, clientes..."
              className="h-11 flex-1 border-none bg-transparent text-[14px] font-medium text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            />
            <kbd className="shrink-0 rounded-[6px] border border-[var(--line-strong)] bg-[var(--field)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--muted)]">
              Esc
            </kbd>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Resultados de búsqueda"
            className="max-h-[min(50dvh,420px)] overflow-y-auto py-2"
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] font-semibold text-[var(--muted)]">
                {trimmedQuery ? "Sin resultados." : "Escribe para buscar."}
              </p>
            ) : (
              results.map((result, index) => (
                <button
                  key={result.id}
                  id={result.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={result.onSelect}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] font-bold transition-colors duration-100 ${
                    index === activeIndex
                      ? "bg-[var(--accent-soft)] text-[var(--accent-soft-text)]"
                      : "text-[var(--ink)]"
                  }`}
                >
                  <span className="truncate">{result.title}</span>
                  <span
                    className={`shrink-0 text-[10px] font-semibold ${
                      index === activeIndex ? "text-[var(--accent-soft-muted)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {result.subtitle}
                  </span>
                </button>
              ))
            )}
            {trimmedQuery && entitiesStatus === "loading" ? (
              <p className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold text-[var(--muted)]">
                <ArrowsClockwise size={13} className="animate-spin" aria-hidden="true" />
                Buscando productos y clientes...
              </p>
            ) : null}
            {trimmedQuery && entitiesStatus === "error" ? (
              <p className="px-4 py-2 text-[11px] font-semibold text-[var(--danger)]">
                No se pudieron cargar productos/clientes.
              </p>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
