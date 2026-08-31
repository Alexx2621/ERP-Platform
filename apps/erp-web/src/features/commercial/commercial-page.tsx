import { ArrowLeft, Percent, Plus, Receipt, Warehouse as WarehouseIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TenantSummary } from "@erp/api-client";
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
import { PriceListsPanel } from "./price-lists-panel";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface CommercialPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface MasterDataItem {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface TaxItem extends MasterDataItem {
  rate: string;
}

interface WarehouseItem extends MasterDataItem {
  addressLine: string | null;
  city: string | null;
  country: string | null;
}

interface TaxesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
}

function TaxesPanel({ selection, companyId }: TaxesPanelProps) {
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<TaxItem[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listTaxes(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );

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
      const accessToken = await getAccessToken();
      const created = await apiClient.createTax(accessToken, selection.slug, companyId, { code, name, rate });
      setItems((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setRate("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: TaxItem) => {
    setPendingId(item.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setTaxStatus(accessToken, selection.slug, companyId, item.id, {
        status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
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
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Impuestos de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo impuesto
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
          <TableCaption>Impuestos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Tasa</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items === null ? (
              <LoadingRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay impuestos" />
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{item.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{item.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{item.rate}%</TableCell>
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
        title="Nuevo impuesto"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="tax-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="tax-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="tax-code" label="Código" value={code} autoFocus required onChange={(event) => setCode(event.target.value)} />
          <FormField name="tax-name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
          <FormField
            name="tax-rate"
            label="Tasa (%)"
            value={rate}
            required
            placeholder="12.0000"
            hint="Porcentaje, por ejemplo 12.0000 significa 12%."
            onChange={(event) => setRate(event.target.value)}
          />
        </form>
      </Modal>
    </section>
  );
}

interface WarehousesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
}

function WarehousesPanel({ selection, companyId }: WarehousesPanelProps) {
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<WarehouseItem[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listWarehouses(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );

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
      const accessToken = await getAccessToken();
      const created = await apiClient.createWarehouse(accessToken, selection.slug, companyId, {
        code,
        name,
        city: city || undefined,
      });
      setItems((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setCity("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: WarehouseItem) => {
    setPendingId(item.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setWarehouseStatus(accessToken, selection.slug, companyId, item.id, {
        status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
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
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Bodegas de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva bodega
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
          <TableCaption>Bodegas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Ciudad</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items === null ? (
              <LoadingRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay bodegas" />
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{item.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{item.name}</TableCell>
                  <TableCell className="text-[12px]">{item.city ?? "—"}</TableCell>
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
        title="Nueva bodega"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="warehouse-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="warehouse-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="warehouse-code" label="Código" value={code} autoFocus required onChange={(event) => setCode(event.target.value)} />
          <FormField name="warehouse-name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
          <FormField name="warehouse-city" label="Ciudad" value={city} onChange={(event) => setCity(event.target.value)} />
        </form>
      </Modal>
    </section>
  );
}

export function CommercialPage({ selection, navigate }: CommercialPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Comercial"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar impuestos, bodegas y precios." />
        </div>
      </ProductShell>
    );
  }

  return <CommercialWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface CommercialWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function CommercialWorkspace({ selection, companyId, navigate }: CommercialWorkspaceProps) {
  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Comercial"
      description="Administra impuestos, bodegas y listas de precios de la empresa activa."
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
          ariaLabel="Administración comercial"
          items={[
            {
              id: "taxes",
              label: (
                <span className="flex items-center gap-2">
                  <Percent size={16} aria-hidden="true" />
                  Impuestos
                </span>
              ),
              panel: <TaxesPanel selection={selection} companyId={companyId} />,
            },
            {
              id: "warehouses",
              label: (
                <span className="flex items-center gap-2">
                  <WarehouseIcon size={16} aria-hidden="true" />
                  Bodegas
                </span>
              ),
              panel: <WarehousesPanel selection={selection} companyId={companyId} />,
            },
            {
              id: "pricing",
              label: (
                <span className="flex items-center gap-2">
                  <Receipt size={16} aria-hidden="true" />
                  Precios
                </span>
              ),
              panel: <PriceListsPanel selection={selection} companyId={companyId} />,
            },
          ]}
        />
      </div>
    </ProductShell>
  );
}
