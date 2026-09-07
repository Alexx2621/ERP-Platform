import { ArrowRight, ListDashes, Plus, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  CustomerResponse,
  ProductResponse,
  QuoteLineResponse,
  QuoteResponse,
  SalesOrderResponse,
  TaxResponse,
  WarehouseResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { formatDate } from "../../shared/format/date";
import { formatMoney } from "../../shared/format/money";
import { Button } from "../../shared/ui/button";
import {
  DataTableFilter,
  DataTableToolbar,
  PaginationFooter,
  SortableHead,
  useWorkTable,
} from "../../shared/ui/data-table";
import { StatusBadge } from "../../shared/ui/status-badge";
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
import {
  CustomerSelect,
  LineTargetFields,
  channelLabel,
  customerLabel,
  isAbortError,
  productLabel,
  quoteStatusLabel,
  quoteStatusTone,
  type WorkspaceSelection,
} from "./sales-shared";

interface QuotesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  customers: CustomerResponse[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  active: boolean;
  onConverted: (order: SalesOrderResponse) => void;
}

interface DetailModalProps {
  quote: QuoteResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  onOpenChange: (open: boolean) => void;
  onQuoteUpdated: (quote: QuoteResponse) => void;
  onConverted: (order: SalesOrderResponse) => void;
}

function QuoteDetailModal({
  quote,
  selection,
  companyId,
  products,
  warehouses,
  taxes,
  onOpenChange,
  onQuoteUpdated,
  onConverted,
}: DetailModalProps) {
  const { getAccessToken } = useAuth();
  const [lines, setLines] = useState<QuoteLineResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [convertWarehouseId, setConvertWarehouseId] = useState("");
  const [actionBusy, setActionBusy] = useState<"convert" | "cancel">();
  const [actionError, setActionError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!quote) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setLines(await apiClient.listQuoteLines(accessToken, selection.slug, companyId, quote.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, quote, selection.slug],
  );

  useEffect(() => {
    if (!quote) {
      setLines(null);
      return;
    }
    setProductId("");
    setProductVariantId("");
    setTaxId("");
    setQuantity("");
    setDiscountAmount("");
    setUnitPrice("");
    setFormError(undefined);
    setConvertWarehouseId("");
    setActionError(undefined);
    void load();
  }, [load, quote]);

  const isDraft = quote?.status === "DRAFT";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quote) return;
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addQuoteLine(accessToken, selection.slug, companyId, quote.id, {
        productId,
        productVariantId: productVariantId || undefined,
        taxId: taxId || undefined,
        quantity,
        unitPrice: unitPrice || undefined,
        discountAmount: discountAmount || undefined,
      });
      setLines((current) => [...(current ?? []), created]);
      setProductId("");
      setProductVariantId("");
      setTaxId("");
      setQuantity("");
      setDiscountAmount("");
      setUnitPrice("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!quote) return;
    setActionError(undefined);
    setActionBusy("convert");
    try {
      const accessToken = await getAccessToken();
      const order = await apiClient.convertQuoteToSalesOrder(accessToken, selection.slug, companyId, quote.id, {
        warehouseId: convertWarehouseId || undefined,
      });
      onQuoteUpdated({ ...quote, status: "CONVERTED" });
      onConverted(order);
      onOpenChange(false);
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActionBusy(undefined);
    }
  };

  const cancel = async () => {
    if (!quote) return;
    setActionError(undefined);
    setActionBusy("cancel");
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.cancelQuote(accessToken, selection.slug, companyId, quote.id);
      onQuoteUpdated(updated);
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActionBusy(undefined);
    }
  };

  return (
    <Modal
      open={Boolean(quote)}
      onOpenChange={(open) => !busy && !actionBusy && onOpenChange(open)}
      title={quote ? `Cotización ${quote.currency} · ${quoteStatusLabel(quote.status)}` : "Cotización"}
      description="Cada línea guarda un precio congelado en el momento en que se agrega."
    >
      <div className="grid gap-6">
        {actionError ? <ErrorNotice message={actionError} /> : null}
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={lines === null}>
            <TableCaption>Líneas de la cotización</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Cantidad</TableHead>
                <TableHead scope="col">Precio unitario</TableHead>
                <TableHead scope="col">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines === null ? (
                <LoadingRows columns={4} />
              ) : lines.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={4} title="Todavía no hay líneas" />
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-[12px] font-semibold">{productLabel(products, line.productId)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{line.quantity}</TableCell>
                    <TableCell className="font-mono text-[11px]">{line.unitPrice}</TableCell>
                    <TableCell className="font-mono text-[11px] font-bold">{line.lineTotal}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {isDraft ? (
          <form
            className="grid gap-4 border-t border-[var(--line)] pt-5"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <p className="text-[12px] font-extrabold text-[var(--ink)]">Agregar línea</p>
            {formError ? <ErrorNotice message={formError} /> : null}
            <LineTargetFields
              fieldPrefix="quote-line"
              selection={selection}
              companyId={companyId}
              products={products}
              warehouses={warehouses}
              taxes={taxes}
              productId={productId}
              onProductIdChange={setProductId}
              productVariantId={productVariantId}
              onProductVariantIdChange={setProductVariantId}
              warehouseId=""
              onWarehouseIdChange={() => {}}
              taxId={taxId}
              onTaxIdChange={setTaxId}
              requireWarehouse={false}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                name="quote-line-quantity"
                label="Cantidad"
                value={quantity}
                required
                placeholder="2.0000"
                onChange={(event) => setQuantity(event.target.value)}
              />
              <FormField
                name="quote-line-unitPrice"
                label="Precio unitario (opcional)"
                value={unitPrice}
                placeholder="Usa el precio del producto"
                onChange={(event) => setUnitPrice(event.target.value)}
              />
              <FormField
                name="quote-line-discountAmount"
                label="Descuento (opcional)"
                value={discountAmount}
                placeholder="0.0000"
                onChange={(event) => setDiscountAmount(event.target.value)}
              />
            </div>
            <Button type="submit" busy={busy} className="w-fit">
              <Plus size={16} weight="bold" aria-hidden="true" />
              Agregar línea
            </Button>
          </form>
        ) : null}

        {isDraft ? (
          <div className="grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
            <div className="grid gap-3">
              <p className="text-[12px] font-extrabold text-[var(--ink)]">Convertir a pedido</p>
              <Select
                name="quote-convert-warehouseId"
                label="Bodega para líneas con inventario (opcional)"
                value={convertWarehouseId}
                onChange={(event) => setConvertWarehouseId(event.target.value)}
              >
                <option value="">Sin bodega</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </Select>
              <Button type="button" busy={actionBusy === "convert"} onClick={() => void convert()} className="w-fit">
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
                Convertir a pedido
              </Button>
            </div>
            <div className="grid content-start gap-3">
              <p className="text-[12px] font-extrabold text-[var(--ink)]">Cancelar cotización</p>
              <Button type="button" variant="quiet" busy={actionBusy === "cancel"} onClick={() => void cancel()} className="w-fit">
                <XCircle size={16} weight="bold" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function QuotesPanel({ selection, companyId, customers, products, warehouses, taxes, active, onConverted }: QuotesPanelProps) {
  const { getAccessToken } = useAuth();
  const [quotes, setQuotes] = useState<QuoteResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailQuote, setDetailQuote] = useState<QuoteResponse | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setQuotes(await apiClient.listQuotes(accessToken, selection.slug, companyId, {}, signal));
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

  const [statusFilter, setStatusFilter] = useState("");

  const rows = useMemo(() => quotes ?? [], [quotes]);
  const searchable = useCallback(
    (quote: QuoteResponse) => `${quote.number} ${customerLabel(customers, quote.customerId)} ${quote.currency}`,
    [customers],
  );
  const sortValue = useCallback(
    (quote: QuoteResponse, column: string): string | number => {
      switch (column) {
        case "customer":
          return customerLabel(customers, quote.customerId);
        case "createdAt":
          return new Date(quote.createdAt).getTime();
        case "total":
          return Number(quote.total);
        case "status":
          return quote.status;
        default:
          return quote.number;
      }
    },
    [customers],
  );
  const filter = useCallback(
    (quote: QuoteResponse) => statusFilter === "" || quote.status === statusFilter,
    [statusFilter],
  );
  const table = useWorkTable<QuoteResponse>({
    rows,
    searchable,
    sortValue,
    filter,
    initialSort: { column: "createdAt", direction: "desc" },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createQuote(accessToken, selection.slug, companyId, {
        customerId,
        currency,
        notes: notes || undefined,
      });
      setQuotes((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCustomerId("");
      setCurrency("USD");
      setNotes("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div>
          <DataTableToolbar
            search={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Buscar por número o cliente…"
            filters={
              <DataTableFilter
                label="Estado"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: "Todos los estados" },
                  { value: "DRAFT", label: "Borrador" },
                  { value: "CONVERTED", label: "Convertida" },
                  { value: "CANCELLED", label: "Cancelada" },
                ]}
              />
            }
            action={
              <Button type="button" onClick={() => setModalOpen(true)}>
                <Plus size={17} weight="bold" aria-hidden="true" />
                Nueva cotización
              </Button>
            }
          />
          <Table aria-busy={quotes === null}>
            <TableCaption>Cotizaciones</TableCaption>
            <TableHeader>
              <TableRow>
                <SortableHead scope="col" column="number" sort={table.sort} onSortChange={table.setSort}>
                  Número
                </SortableHead>
                <SortableHead scope="col" column="createdAt" sort={table.sort} onSortChange={table.setSort}>
                  Fecha
                </SortableHead>
                <SortableHead scope="col" column="customer" sort={table.sort} onSortChange={table.setSort}>
                  Cliente
                </SortableHead>
                <TableHead scope="col">Canal</TableHead>
                <SortableHead
                  scope="col"
                  column="total"
                  sort={table.sort}
                  onSortChange={table.setSort}
                  className="text-right"
                >
                  Total
                </SortableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes === null ? (
                <LoadingRows columns={7} />
              ) : table.visible.length === 0 ? (
                <TableRow>
                  <TableEmpty
                    colSpan={7}
                    title={quotes.length === 0 ? "Todavía no hay cotizaciones" : "Ningún resultado"}
                    description={
                      quotes.length === 0
                        ? undefined
                        : "Ajusta la búsqueda o el filtro de estado para ver más registros."
                    }
                  />
                </TableRow>
              ) : (
                table.visible.map((quote) => (
                  <TableRow key={quote.id} className="cursor-pointer" onClick={() => setDetailQuote(quote)}>
                    <TableCell className="whitespace-nowrap font-mono text-[12px]">{quote.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-[12px] font-medium text-[var(--muted-strong)]">
                      {formatDate(quote.createdAt)}
                    </TableCell>
                    <TableCell className="text-[12px] font-semibold">
                      {customerLabel(customers, quote.customerId)}
                    </TableCell>
                    <TableCell className="text-[12px]">{channelLabel(quote.channel)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-[12px]">
                      {formatMoney(quote.total, quote.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={quoteStatusTone(quote.status)}>
                        {quoteStatusLabel(quote.status)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailQuote(quote);
                        }}
                      >
                        <ListDashes size={16} weight="bold" aria-hidden="true" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationFooter
            page={table.page}
            pageCount={table.pageCount}
            total={table.total}
            filtered={table.filteredCount}
            onPageChange={table.setPage}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => !busy && setModalOpen(open)}
        title="Nueva cotización"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="quote-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="quote-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          {customers.length === 0 ? (
            <ErrorNotice message="Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos." />
          ) : (
            <CustomerSelect fieldPrefix="quote" customers={customers} value={customerId} onChange={setCustomerId} />
          )}
          <FormField
            name="quote-currency"
            label="Moneda (ISO 4217)"
            value={currency}
            required
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <FormField name="quote-notes" label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </form>
      </Modal>

      <QuoteDetailModal
        quote={detailQuote}
        selection={selection}
        companyId={companyId}
        products={products}
        warehouses={warehouses}
        taxes={taxes}
        onOpenChange={(open) => !open && setDetailQuote(null)}
        onQuoteUpdated={(updated) => {
          setQuotes((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
          setDetailQuote(updated);
        }}
        onConverted={onConverted}
      />
    </section>
  );
}
