import { ArrowLeft, FolderOpen, Plus, Ruler, Tag, TShirt } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { TenantSummary, UnitOfMeasureResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { Tabs } from "../../shared/ui/tabs";
import { ProductsPanel } from "./products-panel";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface CatalogPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface SimpleMasterDataItem {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface SimpleMasterDataPanelProps<T extends SimpleMasterDataItem> {
  /** Unique per instance — Tabs keeps every panel mounted at once (docs/WORK_QUEUE.md's already-documented behavior), so field ids/names must not collide across the Units/Categories/Brands modals sharing this component. */
  fieldPrefix: string;
  entityLabel: string;
  emptyTitle: string;
  extraColumnLabel?: string;
  renderExtraColumn?: (item: T) => ReactNode;
  extraCreateField?: ReactNode;
  load: (signal?: AbortSignal) => Promise<T[]>;
  create: (fields: { code: string; name: string }) => Promise<T>;
  setStatus: (id: string, status: "ACTIVE" | "INACTIVE") => Promise<T>;
}

/**
 * Reusable list+create+toggle CRUD panel — UnitOfMeasure/Category/Brand are
 * structurally identical (code+name+status master data). Extracted here
 * because triplicating ~150 lines of near-identical JSX would be real
 * duplication, not the "three similar lines" the project's anti-abstraction
 * guidance is about preserving.
 */
function SimpleMasterDataPanel<T extends SimpleMasterDataItem>({
  fieldPrefix,
  entityLabel,
  emptyTitle,
  extraColumnLabel,
  renderExtraColumn,
  extraCreateField,
  load,
  create,
  setStatus,
}: SimpleMasterDataPanelProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        setItems(await load(signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [load],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const created = await create({ code, name });
      setItems((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: T) => {
    setPendingId(item.id);
    try {
      const updated = await setStatus(item.id, item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">
          Catálogo de {entityLabel.toLowerCase()} para la empresa activa.
        </p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva {entityLabel.toLowerCase()}
        </Button>
      </div>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={items === null}>
          <TableCaption>{entityLabel}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              {extraColumnLabel ? <TableHead scope="col">{extraColumnLabel}</TableHead> : null}
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items === null ? (
              <LoadingRows columns={extraColumnLabel ? 5 : 4} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={extraColumnLabel ? 5 : 4} title={emptyTitle} />
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{item.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{item.name}</TableCell>
                  {renderExtraColumn ? <TableCell>{renderExtraColumn(item)}</TableCell> : null}
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${item.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      {item.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant={item.status === "ACTIVE" ? "quiet" : "secondary"}
                      className="h-9 px-3"
                      busy={pendingId === item.id}
                      onClick={() => void toggle(item)}
                    >
                      {item.status === "ACTIVE" ? "Desactivar" : "Activar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => !busy && setModalOpen(open)}
        title={`Nueva ${entityLabel.toLowerCase()}`}
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={`${fieldPrefix}-form`} busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id={`${fieldPrefix}-form`}
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField
            name={`${fieldPrefix}-code`}
            label="Código"
            value={code}
            autoFocus
            required
            onChange={(event) => setCode(event.target.value)}
          />
          <FormField
            name={`${fieldPrefix}-name`}
            label="Nombre"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
          {extraCreateField}
        </form>
      </Modal>
    </section>
  );
}

export function CatalogPage({ selection, navigate }: CatalogPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Catálogo"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar el catálogo." />
        </div>
      </ProductShell>
    );
  }

  return <CatalogWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface CatalogWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

/**
 * Split out from `CatalogPage` so every hook below runs unconditionally on
 * every render — `companyId` is only known once `CatalogPage`'s own early
 * return has already happened, and calling hooks after a conditional
 * return breaks the Rules of Hooks the moment `selection.companyId` goes
 * from undefined to defined without unmounting the page.
 */
function CatalogWorkspace({ selection, companyId, navigate }: CatalogWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [symbol, setSymbol] = useState("");
  const [activeTab, setActiveTab] = useState("units");
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  /**
   * Memoized with stable dependencies only (never `symbol`) so typing into
   * the Unit-of-measure "Símbolo" field — state that lives here, not inside
   * `SimpleMasterDataPanel` — doesn't hand every panel (Units/Categories/
   * Brands) a new `load` identity on every keystroke. `SimpleMasterDataPanel`
   * re-runs its fetch effect whenever `load`'s identity changes, so an
   * unmemoized inline closure here caused the whole catalog to refetch on
   * every keystroke, and — because `create` also calls `setSymbol("")` right
   * after a successful creation — clobbered the just-created row with a
   * stale re-fetch before the user ever saw it.
   */
  const loadUnitsOfMeasure = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listUnitsOfMeasure(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );
  const createUnitOfMeasure = useCallback(
    async ({ code, name }: { code: string; name: string }) => {
      const accessToken = await getAccessToken();
      const created = await apiClient.createUnitOfMeasure(accessToken, selection.slug, companyId, {
        code,
        name,
        symbol: symbolRef.current,
      });
      setSymbol("");
      return created;
    },
    [companyId, getAccessToken, selection.slug],
  );
  const setUnitOfMeasureStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE") => {
      const accessToken = await getAccessToken();
      return apiClient.setUnitOfMeasureStatus(accessToken, selection.slug, companyId, id, { status });
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadCategories = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listCategories(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );
  const createCategory = useCallback(
    async ({ code, name }: { code: string; name: string }) => {
      const accessToken = await getAccessToken();
      return apiClient.createCategory(accessToken, selection.slug, companyId, { code, name });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const setCategoryStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE") => {
      const accessToken = await getAccessToken();
      return apiClient.setCategoryStatus(accessToken, selection.slug, companyId, id, { status });
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadBrands = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listBrands(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );
  const createBrand = useCallback(
    async ({ code, name }: { code: string; name: string }) => {
      const accessToken = await getAccessToken();
      return apiClient.createBrand(accessToken, selection.slug, companyId, { code, name });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const setBrandStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE") => {
      const accessToken = await getAccessToken();
      return apiClient.setBrandStatus(accessToken, selection.slug, companyId, id, { status });
    },
    [companyId, getAccessToken, selection.slug],
  );

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Catálogo"
      description="Administra unidades de medida, categorías, marcas y productos de la empresa activa."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <div className="pt-7">
        <Tabs
          ariaLabel="Administración de catálogo"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            {
              id: "units",
              label: (
                <span className="flex items-center gap-2">
                  <Ruler size={16} aria-hidden="true" />
                  Unidades
                </span>
              ),
              panel: (
                <SimpleMasterDataPanel<UnitOfMeasureResponse>
                  fieldPrefix="uom"
                  entityLabel="Unidad de medida"
                  emptyTitle="Todavía no hay unidades de medida"
                  extraColumnLabel="Símbolo"
                  renderExtraColumn={(item) => <span className="font-mono text-[11px]">{item.symbol}</span>}
                  extraCreateField={
                    <FormField
                      name="uom-symbol"
                      label="Símbolo"
                      value={symbol}
                      required
                      onChange={(event) => setSymbol(event.target.value)}
                    />
                  }
                  load={loadUnitsOfMeasure}
                  create={createUnitOfMeasure}
                  setStatus={setUnitOfMeasureStatus}
                />
              ),
            },
            {
              id: "categories",
              label: (
                <span className="flex items-center gap-2">
                  <FolderOpen size={16} aria-hidden="true" />
                  Categorías
                </span>
              ),
              panel: (
                <SimpleMasterDataPanel
                  fieldPrefix="category"
                  entityLabel="Categoría"
                  emptyTitle="Todavía no hay categorías"
                  load={loadCategories}
                  create={createCategory}
                  setStatus={setCategoryStatus}
                />
              ),
            },
            {
              id: "brands",
              label: (
                <span className="flex items-center gap-2">
                  <Tag size={16} aria-hidden="true" />
                  Marcas
                </span>
              ),
              panel: (
                <SimpleMasterDataPanel
                  fieldPrefix="brand"
                  entityLabel="Marca"
                  emptyTitle="Todavía no hay marcas"
                  load={loadBrands}
                  create={createBrand}
                  setStatus={setBrandStatus}
                />
              ),
            },
            {
              id: "products",
              label: (
                <span className="flex items-center gap-2">
                  <TShirt size={16} aria-hidden="true" />
                  Productos
                </span>
              ),
              panel: (
                <ProductsPanel selection={selection} companyId={companyId} active={activeTab === "products"} />
              ),
            },
          ]}
        />
      </div>
    </ProductShell>
  );
}
