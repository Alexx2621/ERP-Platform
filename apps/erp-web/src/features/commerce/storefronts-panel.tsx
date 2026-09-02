import { CheckCircle, ListDashes, Plus, Trash, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ProductResponse, StorefrontProductResponse, StorefrontResponse, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { isAbortError, statusToneClass, storefrontStatusLabel, type WorkspaceSelection } from "./commerce-shared";

interface StorefrontDetailModalProps {
  storefront: StorefrontResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  onOpenChange: (open: boolean) => void;
}

function StorefrontDetailModal({ storefront, selection, companyId, products, onOpenChange }: StorefrontDetailModalProps) {
  const { getAccessToken } = useAuth();
  const [publications, setPublications] = useState<StorefrontProductResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [productId, setProductId] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [unpublishBusyId, setUnpublishBusyId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!storefront) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setPublications(await apiClient.listStorefrontProducts(accessToken, selection.slug, companyId, storefront.id, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug, storefront],
  );

  useEffect(() => {
    if (!storefront) {
      setPublications(null);
      return;
    }
    setProductId("");
    setFormError(undefined);
    void load();
  }, [load, storefront]);

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storefront) return;
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.publishProduct(accessToken, selection.slug, companyId, storefront.id, { productId });
      setPublications((current) => {
        const withoutExisting = (current ?? []).filter((row) => row.id !== created.id);
        return [created, ...withoutExisting];
      });
      setProductId("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async (row: StorefrontProductResponse) => {
    if (!storefront) return;
    setUnpublishBusyId(row.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.unpublishProduct(accessToken, selection.slug, companyId, storefront.id, row.productId);
      setPublications((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setUnpublishBusyId(undefined);
    }
  };

  const published = (publications ?? []).filter((row) => row.status === "PUBLISHED");

  return (
    <Modal
      open={Boolean(storefront)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={storefront ? `Catálogo publicado · ${storefront.name}` : "Catálogo publicado"}
      description={storefront ? `Handle público: ${storefront.code}` : undefined}
    >
      <div className="grid gap-6">
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={publications === null}>
            <TableCaption>Productos publicados en esta tienda</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publications === null ? (
                <LoadingRows columns={3} />
              ) : published.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={3} title="Todavía no hay productos publicados en esta tienda" />
                </TableRow>
              ) : (
                published.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-[12px] font-semibold">
                      {row.productName} ({row.productCode})
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Publicado</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="quiet" className="h-9 px-3" busy={unpublishBusyId === row.id} onClick={() => void unpublish(row)}>
                        <Trash size={16} weight="bold" aria-hidden="true" />
                        Despublicar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <form
          className="grid gap-4 border-t border-[var(--line)] pt-5"
          onSubmit={(event) => {
            void publish(event);
          }}
        >
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Publicar un producto</p>
          {formError ? <ErrorNotice message={formError} /> : null}
          <Select name="storefront-publish-productId" label="Producto" value={productId} required onChange={(event) => setProductId(event.target.value)}>
            <option value="">Selecciona un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </Select>
          <Button type="submit" busy={busy} className="w-fit" disabled={!productId}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            Publicar
          </Button>
        </form>
      </div>
    </Modal>
  );
}

interface StorefrontsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  active: boolean;
}

export function StorefrontsPanel({ selection, companyId, products, warehouses, active }: StorefrontsPanelProps) {
  const { getAccessToken } = useAuth();
  const [storefronts, setStorefronts] = useState<StorefrontResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailStorefront, setDetailStorefront] = useState<StorefrontResponse | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string>();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [defaultWarehouseId, setDefaultWarehouseId] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setStorefronts(await apiClient.listStorefronts(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active, load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createStorefront(accessToken, selection.slug, companyId, {
        code,
        name,
        currency,
        defaultWarehouseId: defaultWarehouseId || undefined,
      });
      setStorefronts((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setCurrency("USD");
      setDefaultWarehouseId("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (storefront: StorefrontResponse) => {
    setStatusBusyId(storefront.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setStorefrontStatus(accessToken, selection.slug, companyId, storefront.id, {
        status: storefront.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setStorefronts((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setStatusBusyId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">
          Tiendas en línea de la empresa activa. El "handle" es el identificador público que usa la tienda Next.js.
        </p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva tienda
        </Button>
      </div>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={storefronts === null}>
          <TableCaption>Tiendas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Handle</TableHead>
              <TableHead scope="col">Moneda</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storefronts === null ? (
              <LoadingRows columns={5} />
            ) : storefronts.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay tiendas en línea" />
              </TableRow>
            ) : (
              storefronts.map((storefront) => (
                <TableRow key={storefront.id}>
                  <TableCell className="text-[12px] font-semibold">{storefront.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{storefront.code}</TableCell>
                  <TableCell className="font-mono text-[11px]">{storefront.currency}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(storefront.status === "ACTIVE")}`}>
                      {storefrontStatusLabel(storefront.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setDetailStorefront(storefront)}>
                        <ListDashes size={16} weight="bold" aria-hidden="true" />
                        Catálogo
                      </Button>
                      <Button type="button" variant="quiet" className="h-9 px-3" busy={statusBusyId === storefront.id} onClick={() => void toggleStatus(storefront)}>
                        {storefront.status === "ACTIVE" ? (
                          <XCircle size={16} weight="bold" aria-hidden="true" />
                        ) : (
                          <CheckCircle size={16} weight="bold" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
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
        title="Nueva tienda"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="storefront-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="storefront-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField
            name="storefront-code"
            label="Handle público (2-63 letras/números/guiones)"
            value={code}
            required
            placeholder="main-store"
            hint="Es globalmente único en toda la plataforma — es lo que usa la tienda Next.js en su URL."
            onChange={(event) => setCode(event.target.value)}
          />
          <FormField name="storefront-name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
          <FormField
            name="storefront-currency"
            label="Moneda (ISO 4217)"
            value={currency}
            required
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <Select
            name="storefront-defaultWarehouseId"
            label="Bodega por defecto (opcional)"
            value={defaultWarehouseId}
            onChange={(event) => setDefaultWarehouseId(event.target.value)}
          >
            <option value="">Sin bodega (solo productos sin inventario)</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <StorefrontDetailModal
        storefront={detailStorefront}
        selection={selection}
        companyId={companyId}
        products={products}
        onOpenChange={(open) => !open && setDetailStorefront(null)}
      />
    </section>
  );
}
