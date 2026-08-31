import { ListDashes, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PriceListItemResponse, PriceListResponse, ProductResponse, TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
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

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface PriceListsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface ItemsModalProps {
  priceList: PriceListResponse | null;
  products: ProductResponse[];
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
}

function ItemsModal({ priceList, products, selection, companyId, onOpenChange }: ItemsModalProps) {
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<PriceListItemResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const sellableProducts = products.filter((product) => !product.hasVariants);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!priceList) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setItems(await apiClient.listPriceListItems(accessToken, selection.slug, companyId, priceList.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, priceList, selection.slug],
  );

  useEffect(() => {
    if (!priceList) {
      setItems(null);
      return;
    }
    setProductId("");
    setPrice("");
    setFormError(undefined);
    void load();
  }, [load, priceList]);

  const productName = (id: string): string => products.find((product) => product.id === id)?.name ?? id;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!priceList) return;
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addPriceListItem(accessToken, selection.slug, companyId, priceList.id, {
        productId,
        price,
      });
      setItems((current) => [...(current ?? []), created]);
      setProductId("");
      setPrice("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: PriceListItemResponse) => {
    if (!priceList) return;
    setPendingId(item.id);
    try {
      const accessToken = await getAccessToken();
      await apiClient.removePriceListItem(accessToken, selection.slug, companyId, priceList.id, item.id);
      setItems((current) => (current ?? []).filter((existing) => existing.id !== item.id));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <Modal
      open={Boolean(priceList)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={priceList ? `Precios de ${priceList.name}` : "Precios"}
      description="Cada producto sin variantes puede tener un precio propio en esta lista."
    >
      <div className="grid gap-6">
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={items === null}>
            <TableCaption>Productos con precio en esta lista</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Precio</TableHead>
                <TableHead scope="col" className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items === null ? (
                <LoadingRows columns={3} />
              ) : items.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={3} title="Todavía no hay productos en esta lista" />
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-[12px] font-semibold">{productName(item.productId)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{item.price}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === item.id}
                        onClick={() => void remove(item)}
                      >
                        <Trash size={16} weight="bold" aria-hidden="true" />
                        Quitar
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
            void submit(event);
          }}
        >
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Agregar producto</p>
          {formError ? <ErrorNotice message={formError} /> : null}
          {sellableProducts.length === 0 ? (
            <ErrorNotice message="No hay productos sin variantes disponibles. Los productos con variantes no se pueden agregar a una lista de precios en esta versión." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                name="item-productId"
                label="Producto"
                value={productId}
                required
                onChange={(event) => setProductId(event.target.value)}
              >
                <option value="">Selecciona un producto</option>
                {sellableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </Select>
              <FormField
                name="item-price"
                label="Precio"
                value={price}
                required
                placeholder="24.9900"
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          )}
          <Button type="submit" busy={busy} disabled={sellableProducts.length === 0} className="w-fit">
            <Plus size={16} weight="bold" aria-hidden="true" />
            Agregar
          </Button>
        </form>
      </div>
    </Modal>
  );
}

export function PriceListsPanel({ selection, companyId }: PriceListsPanelProps) {
  const { getAccessToken } = useAuth();
  const [priceLists, setPriceLists] = useState<PriceListResponse[] | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [itemsPriceList, setItemsPriceList] = useState<PriceListResponse | null>(null);
  const [pendingId, setPendingId] = useState<string>();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [priceListsResult, productsResult] = await Promise.all([
          apiClient.listPriceLists(accessToken, selection.slug, companyId, signal),
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
        ]);
        setPriceLists(priceListsResult);
        setProducts(productsResult);
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggleStatus = async (priceList: PriceListResponse) => {
    setPendingId(priceList.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setPriceListStatus(accessToken, selection.slug, companyId, priceList.id, {
        status: priceList.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setPriceLists((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPriceList(accessToken, selection.slug, companyId, {
        code,
        name,
        currency,
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
      });
      setPriceLists((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setCurrency("USD");
      setValidFrom("");
      setValidUntil("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Listas de precios de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva lista de precios
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
        <Table aria-busy={priceLists === null}>
          <TableCaption>Listas de precios</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Moneda</TableHead>
              <TableHead scope="col">Vigencia</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceLists === null ? (
              <LoadingRows columns={6} />
            ) : priceLists.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay listas de precios" />
              </TableRow>
            ) : (
              priceLists.map((priceList) => (
                <TableRow key={priceList.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{priceList.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{priceList.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{priceList.currency}</TableCell>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">
                    {priceList.validFrom || priceList.validUntil
                      ? `${priceList.validFrom ?? "…"} – ${priceList.validUntil ?? "…"}`
                      : "Sin límite"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${priceList.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      {priceList.status === "ACTIVE" ? "Activa" : "Inactiva"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3"
                        onClick={() => setItemsPriceList(priceList)}
                      >
                        <ListDashes size={16} weight="bold" aria-hidden="true" />
                        Precios
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === priceList.id}
                        onClick={() => void toggleStatus(priceList)}
                      >
                        {priceList.status === "ACTIVE" ? "Desactivar" : "Activar"}
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
        title="Nueva lista de precios"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="price-list-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="price-list-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="price-list-code" label="Código" value={code} autoFocus required onChange={(event) => setCode(event.target.value)} />
            <FormField name="price-list-name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
          </div>
          <FormField
            name="price-list-currency"
            label="Moneda (ISO 4217)"
            value={currency}
            required
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="price-list-validFrom"
              label="Vigente desde"
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
            />
            <FormField
              name="price-list-validUntil"
              label="Vigente hasta"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
        </form>
      </Modal>

      <ItemsModal
        priceList={itemsPriceList}
        products={products}
        selection={selection}
        companyId={companyId}
        onOpenChange={(open) => !open && setItemsPriceList(null)}
      />
    </section>
  );
}
