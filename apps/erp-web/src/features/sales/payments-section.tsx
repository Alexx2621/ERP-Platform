import { CreditCard } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PaymentResponse, SalesOrderResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import { StatusBadge } from "../../shared/ui/status-badge";
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
  isAbortError,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  type WorkspaceSelection,
} from "./sales-shared";


function newIdempotencyKey(): string {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface PaymentsSectionProps {
  order: SalesOrderResponse;
  selection: WorkspaceSelection;
  companyId: string;
}

export function PaymentsSection({ order, selection, companyId }: PaymentsSectionProps) {
  const { getAccessToken } = useAuth();
  const [payments, setPayments] = useState<PaymentResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setPayments(await apiClient.listPayments(accessToken, selection.slug, companyId, { salesOrderId: order.id }, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order.id, selection.slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const capture = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.capturePayment(accessToken, selection.slug, companyId, {
        salesOrderId: order.id,
        method,
        amount,
        currency: order.currency,
        idempotencyKey: newIdempotencyKey(),
        reference: method === "BANK_TRANSFER" ? reference || undefined : undefined,
      });
      setPayments((current) => [created, ...(current ?? [])]);
      setAmount("");
      setReference("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const refund = async (payment: PaymentResponse) => {
    setPendingId(payment.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.refundPayment(accessToken, selection.slug, companyId, payment.id);
      setPayments((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Pagos</p>
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table aria-busy={payments === null}>
          <TableCaption>Pagos del pedido</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Método</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col">Detalle</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments === null ? (
              <LoadingRows columns={5} />
            ) : payments.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay pagos" />
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-[12px]">{paymentMethodLabel(payment.method)}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {payment.amount} {payment.currency}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={paymentStatusTone(payment.status)}>
                      {paymentStatusLabel(payment.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">
                    {payment.failureReason ?? payment.gatewayReference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "CAPTURED" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === payment.id}
                        onClick={() => void refund(payment)}
                      >
                        Reembolsar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void capture(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            name="payment-method"
            label="Método"
            value={method}
            onChange={(event) => setMethod(event.target.value as "CASH" | "BANK_TRANSFER")}
          >
            <option value="CASH">Efectivo</option>
            <option value="BANK_TRANSFER">Transferencia</option>
          </Select>
          <FormField
            name="payment-amount"
            label={`Monto (${order.currency})`}
            value={amount}
            required
            placeholder="150.0000"
            onChange={(event) => setAmount(event.target.value)}
          />
          {method === "BANK_TRANSFER" ? (
            <FormField
              name="payment-reference"
              label="Número de transferencia"
              value={reference}
              required
              onChange={(event) => setReference(event.target.value)}
            />
          ) : null}
        </div>
        <Button type="submit" busy={busy} className="w-fit">
          <CreditCard size={16} weight="bold" aria-hidden="true" />
          Cobrar
        </Button>
      </form>
    </div>
  );
}
