import { Plus, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PurchaseOrderResponse, SupplierInvoiceResponse, SupplierResponse } from "@erp/api-client";
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
import { SupplierSelect, isAbortError, statusToneClass, supplierInvoiceStatusLabel, supplierLabel, type WorkspaceSelection } from "./purchasing-shared";

interface SupplierInvoicesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  suppliers: SupplierResponse[];
  active: boolean;
}

export function SupplierInvoicesPanel({ selection, companyId, suppliers, active }: SupplierInvoicesPanelProps) {
  const { getAccessToken } = useAuth();
  const [invoices, setInvoices] = useState<SupplierInvoiceResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setInvoices(await apiClient.listSupplierInvoices(accessToken, selection.slug, companyId, {}, signal));
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

  const openModal = async () => {
    setModalOpen(true);
    setSupplierId("");
    setPurchaseOrderId("");
    setInvoiceNumber("");
    setAmount("");
    setCurrency("USD");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setNotes("");
    setFormError(undefined);
    try {
      const accessToken = await getAccessToken();
      setPurchaseOrders(await apiClient.listPurchaseOrders(accessToken, selection.slug, companyId, {}));
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createSupplierInvoice(accessToken, selection.slug, companyId, {
        supplierId,
        purchaseOrderId,
        invoiceNumber,
        amount,
        currency,
        issueDate,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      setInvoices((current) => [created, ...(current ?? [])]);
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (invoice: SupplierInvoiceResponse) => {
    setPendingId(invoice.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.cancelSupplierInvoice(accessToken, selection.slug, companyId, invoice.id);
      setInvoices((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Facturas de proveedor registradas como documento separado.</p>
        <Button type="button" onClick={() => void openModal()}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva factura
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
        <Table aria-busy={invoices === null}>
          <TableCaption>Facturas de proveedor</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Proveedor</TableHead>
              <TableHead scope="col">Número</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices === null ? (
              <LoadingRows columns={5} />
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay facturas de proveedor" />
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-[12px] font-semibold">{supplierLabel(suppliers, invoice.supplierId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {invoice.amount} {invoice.currency}
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(invoice.status === "RECORDED")}`}>
                      {supplierInvoiceStatusLabel(invoice.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.status === "RECORDED" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === invoice.id}
                        onClick={() => void cancel(invoice)}
                      >
                        <XCircle size={16} weight="bold" aria-hidden="true" />
                        Cancelar
                      </Button>
                    ) : null}
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
        title="Nueva factura de proveedor"
        description="Se registra como documento separado, trazado a una orden de compra real del mismo proveedor."
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="supplier-invoice-form" busy={busy}>
              Registrar
            </Button>
          </>
        }
      >
        <form
          id="supplier-invoice-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          {suppliers.length === 0 ? (
            <ErrorNotice message="Todavía no hay proveedores en esta empresa. Crea al menos uno en Contactos." />
          ) : (
            <SupplierSelect fieldPrefix="supplier-invoice" suppliers={suppliers} value={supplierId} onChange={setSupplierId} />
          )}
          {purchaseOrders.length === 0 ? (
            <ErrorNotice message="Todavía no hay órdenes de compra en esta empresa." />
          ) : (
            <Select
              name="supplier-invoice-purchaseOrderId"
              label="Orden de compra"
              value={purchaseOrderId}
              required
              onChange={(event) => setPurchaseOrderId(event.target.value)}
            >
              <option value="">Selecciona una orden</option>
              {purchaseOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} ({order.currency})
                </option>
              ))}
            </Select>
          )}
          <FormField
            name="supplier-invoice-invoiceNumber"
            label="Número de factura del proveedor"
            value={invoiceNumber}
            required
            onChange={(event) => setInvoiceNumber(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="supplier-invoice-amount"
              label="Monto"
              value={amount}
              required
              placeholder="1250.0000"
              onChange={(event) => setAmount(event.target.value)}
            />
            <FormField
              name="supplier-invoice-currency"
              label="Moneda (ISO 4217)"
              value={currency}
              required
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="supplier-invoice-issueDate"
              label="Fecha de emisión"
              type="date"
              value={issueDate}
              required
              onChange={(event) => setIssueDate(event.target.value)}
            />
            <FormField
              name="supplier-invoice-dueDate"
              label="Fecha de vencimiento (opcional)"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <FormField name="supplier-invoice-notes" label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </form>
      </Modal>
    </section>
  );
}
