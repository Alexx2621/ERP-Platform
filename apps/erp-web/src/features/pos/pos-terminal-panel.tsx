import { CreditCard, Lock, LockOpen, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CustomerResponse,
  PosCashMovementResponse,
  PosRegisterResponse,
  PosSaleResponse,
  PosShiftResponse,
  ProductResponse,
  RingUpSaleLineInput,
  TaxResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import {
  CustomerSelect,
  ProductLineFields,
  cashMovementTypeLabel,
  isAbortError,
  newIdempotencyKey,
  productLabel,
  type WorkspaceSelection,
} from "./pos-shared";

interface DraftLine extends RingUpSaleLineInput {
  label: string;
}

interface PosTerminalPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  registers: PosRegisterResponse[];
  customers: CustomerResponse[];
  products: ProductResponse[];
  taxes: TaxResponse[];
  active: boolean;
}

export function PosTerminalPanel({ selection, companyId, registers, customers, products, taxes, active }: PosTerminalPanelProps) {
  const { getAccessToken } = useAuth();
  const activeRegisters = registers.filter((register) => register.status === "ACTIVE");

  const [registerId, setRegisterId] = useState("");
  const [shift, setShift] = useState<PosShiftResponse | null | undefined>(undefined); // undefined = not checked yet
  const [shiftError, setShiftError] = useState<string>();

  useEffect(() => {
    if (activeRegisters.length === 1 && !registerId) setRegisterId(activeRegisters[0].id);
  }, [activeRegisters, registerId]);

  const loadShift = useCallback(
    async (signal?: AbortSignal) => {
      if (!registerId) {
        setShift(undefined);
        return;
      }
      setShiftError(undefined);
      try {
        const accessToken = await getAccessToken();
        const open = await apiClient.listPosShifts(accessToken, selection.slug, companyId, { registerId, status: "OPEN" }, signal);
        setShift(open[0] ?? null);
      } catch (caught) {
        if (!isAbortError(caught)) setShiftError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, registerId, selection.slug],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void loadShift(controller.signal);
    return () => controller.abort();
  }, [active, loadShift]);

  // --- Open shift ---
  const [openingCash, setOpeningCash] = useState("");
  const [notes, setNotes] = useState("");
  const [openBusy, setOpenBusy] = useState(false);
  const [openError, setOpenError] = useState<string>();

  const openShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpenError(undefined);
    setOpenBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.openShift(accessToken, selection.slug, companyId, { registerId, openingCash, notes: notes || undefined });
      setShift(created);
      setOpeningCash("");
      setNotes("");
    } catch (caught) {
      setOpenError(getErrorMessage(caught));
    } finally {
      setOpenBusy(false);
    }
  };

  if (activeRegisters.length === 0) {
    return <ErrorNotice message="No hay cajas activas. Crea o activa una en la pestaña Cajas antes de vender." />;
  }

  return (
    <section className="grid gap-6">
      <Select name="pos-terminal-registerId" label="Caja" value={registerId} required onChange={(event) => setRegisterId(event.target.value)}>
        <option value="">Selecciona una caja</option>
        {activeRegisters.map((register) => (
          <option key={register.id} value={register.id}>
            {register.name} ({register.code})
          </option>
        ))}
      </Select>

      {!registerId ? null : shiftError ? (
        <ErrorNotice message={shiftError} />
      ) : shift === undefined ? (
        <p className="text-[12px] text-[var(--muted)]">Cargando turno…</p>
      ) : shift === null ? (
        <form
          className="grid gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--field)] p-5"
          onSubmit={(event) => {
            void openShift(event);
          }}
        >
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Abrir turno</p>
          {openError ? <ErrorNotice message={openError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="pos-open-openingCash" label="Fondo de caja inicial" value={openingCash} required placeholder="50.0000" onChange={(event) => setOpeningCash(event.target.value)} />
            <FormField name="pos-open-notes" label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <Button type="submit" busy={openBusy} className="w-fit">
            <LockOpen size={16} weight="bold" aria-hidden="true" />
            Abrir turno
          </Button>
        </form>
      ) : (
        <OpenShiftWorkspace
          selection={selection}
          companyId={companyId}
          shift={shift}
          customers={customers}
          products={products}
          taxes={taxes}
          onShiftClosed={() => setShift(null)}
        />
      )}
    </section>
  );
}

interface OpenShiftWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  shift: PosShiftResponse;
  customers: CustomerResponse[];
  products: ProductResponse[];
  taxes: TaxResponse[];
  onShiftClosed: () => void;
}

function OpenShiftWorkspace({ selection, companyId, shift, customers, products, taxes, onShiftClosed }: OpenShiftWorkspaceProps) {
  const { getAccessToken } = useAuth();

  // --- Cart / ring-up ---
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cart, setCart] = useState<DraftLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [ringUpError, setRingUpError] = useState<string>();
  const [ringUpBusy, setRingUpBusy] = useState(false);
  const [lastSale, setLastSale] = useState<PosSaleResponse | null>(null);

  const addToCart = () => {
    if (!productId || !quantity) return;
    setCart((current) => [...current, { productId, productVariantId: productVariantId || undefined, taxId: taxId || undefined, quantity, label: productLabel(products, productId) }]);
    setProductId("");
    setProductVariantId("");
    setTaxId("");
    setQuantity("");
  };

  const ringUp = async () => {
    if (cart.length === 0) {
      setRingUpError("Agrega al menos un producto al carrito.");
      return;
    }
    setRingUpError(undefined);
    setRingUpBusy(true);
    try {
      const accessToken = await getAccessToken();
      const sale = await apiClient.ringUpSale(accessToken, selection.slug, companyId, {
        shiftId: shift.id,
        customerId,
        currency,
        paymentMethod,
        paymentReference: paymentMethod === "BANK_TRANSFER" ? paymentReference || undefined : undefined,
        amountTendered: paymentMethod === "CASH" ? amountTendered || undefined : undefined,
        idempotencyKey: newIdempotencyKey("ring"),
        lines: cart.map(({ label: _label, ...line }) => line),
      });
      setLastSale(sale);
      setCart([]);
      setCustomerId("");
      setPaymentReference("");
      setAmountTendered("");
    } catch (caught) {
      setRingUpError(getErrorMessage(caught));
    } finally {
      setRingUpBusy(false);
    }
  };

  // --- Cash movements ---
  const [movements, setMovements] = useState<PosCashMovementResponse[] | null>(null);
  const [movementType, setMovementType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementError, setMovementError] = useState<string>();
  const [movementBusy, setMovementBusy] = useState(false);

  const loadMovements = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const accessToken = await getAccessToken();
        setMovements(await apiClient.listCashMovements(accessToken, selection.slug, companyId, shift.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setMovementError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug, shift.id],
  );

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const recordMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMovementError(undefined);
    setMovementBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.recordCashMovement(accessToken, selection.slug, companyId, shift.id, {
        type: movementType,
        amount: movementAmount,
        reason: movementReason,
      });
      setMovements((current) => [...(current ?? []), created]);
      setMovementAmount("");
      setMovementReason("");
    } catch (caught) {
      setMovementError(getErrorMessage(caught));
    } finally {
      setMovementBusy(false);
    }
  };

  // --- Close shift ---
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingCashCounted, setClosingCashCounted] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string>();
  const [closedShift, setClosedShift] = useState<PosShiftResponse | null>(null);

  const closeShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCloseError(undefined);
    setCloseBusy(true);
    try {
      const accessToken = await getAccessToken();
      const closed = await apiClient.closeShift(accessToken, selection.slug, companyId, shift.id, { closingCashCounted });
      setClosedShift(closed);
      setCloseModalOpen(false);
    } catch (caught) {
      setCloseError(getErrorMessage(caught));
    } finally {
      setCloseBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--accent-soft)] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">Turno abierto</p>
          <p className="text-[13px] font-semibold text-[var(--ink)]">Fondo inicial: {shift.openingCash}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setCloseModalOpen(true)}>
          <Lock size={16} weight="bold" aria-hidden="true" />
          Cerrar turno
        </Button>
      </div>

      {lastSale ? (
        <div className="grid gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--field)] p-5">
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Última venta registrada</p>
          <p className="text-[12px] text-[var(--muted-strong)]">
            Total {lastSale.amount} · {lastSale.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}
            {lastSale.changeDue ? ` · Cambio a entregar: ${lastSale.changeDue}` : ""}
          </p>
          <Button type="button" variant="quiet" className="w-fit" onClick={() => window.print()}>
            Imprimir ticket
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 rounded-[12px] border border-[var(--line)] p-5">
        <p className="text-[12px] font-extrabold text-[var(--ink)]">Vender</p>
        {ringUpError ? <ErrorNotice message={ringUpError} /> : null}
        <ProductLineFields
          fieldPrefix="pos-cart"
          selection={selection}
          companyId={companyId}
          products={products}
          taxes={taxes}
          productId={productId}
          onProductIdChange={setProductId}
          productVariantId={productVariantId}
          onProductVariantIdChange={setProductVariantId}
          taxId={taxId}
          onTaxIdChange={setTaxId}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField name="pos-cart-quantity" label="Cantidad" value={quantity} placeholder="1.0000" onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <Button type="button" variant="secondary" className="w-fit" disabled={!productId || !quantity} onClick={addToCart}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          Agregar al carrito
        </Button>

        {cart.length > 0 ? (
          <ul className="grid gap-2">
            {cart.map((line, index) => (
              <li key={`${line.productId}-${index}`} className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--ink)]">
                <span>
                  {line.label} · {line.quantity}
                </span>
                <button type="button" className="text-[var(--muted-strong)] hover:text-[var(--danger)]" onClick={() => setCart((current) => current.filter((_, i) => i !== index))} aria-label="Quitar del carrito">
                  <Trash size={16} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
          {customers.length === 0 ? (
            <ErrorNotice message="Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos." />
          ) : (
            <CustomerSelect fieldPrefix="pos-checkout" customers={customers} value={customerId} onChange={setCustomerId} />
          )}
          <FormField name="pos-checkout-currency" label="Moneda (ISO 4217)" value={currency} required maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          <Select name="pos-checkout-paymentMethod" label="Método de pago" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "BANK_TRANSFER")}>
            <option value="CASH">Efectivo</option>
            <option value="BANK_TRANSFER">Transferencia</option>
          </Select>
          {paymentMethod === "BANK_TRANSFER" ? (
            <FormField name="pos-checkout-reference" label="Número de transferencia" value={paymentReference} required onChange={(event) => setPaymentReference(event.target.value)} />
          ) : (
            <FormField name="pos-checkout-amountTendered" label="Efectivo recibido (opcional)" value={amountTendered} placeholder="50.0000" onChange={(event) => setAmountTendered(event.target.value)} />
          )}
        </div>
        <Button type="button" busy={ringUpBusy} disabled={cart.length === 0 || !customerId} className="w-fit" onClick={() => void ringUp()}>
          <CreditCard size={16} weight="bold" aria-hidden="true" />
          Cobrar y facturar
        </Button>
      </div>

      <div className="grid gap-4 rounded-[12px] border border-[var(--line)] p-5">
        <p className="text-[12px] font-extrabold text-[var(--ink)]">Movimientos de caja</p>
        {movementError ? <ErrorNotice message={movementError} /> : null}
        {movements === null ? (
          <p className="text-[12px] text-[var(--muted)]">Cargando…</p>
        ) : movements.length === 0 ? (
          <p className="text-[12px] text-[var(--muted)]">Todavía no hay movimientos en este turno.</p>
        ) : (
          <ul className="grid gap-2">
            {movements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] text-[var(--ink)]">
                <span>{cashMovementTypeLabel(movement.type)} · {movement.reason}</span>
                <span className="font-mono font-bold">{movement.amount}</span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(event) => {
            void recordMovement(event);
          }}
        >
          <Select name="pos-movement-type" label="Tipo" value={movementType} onChange={(event) => setMovementType(event.target.value as "CASH_IN" | "CASH_OUT")}>
            <option value="CASH_IN">Ingreso</option>
            <option value="CASH_OUT">Egreso</option>
          </Select>
          <FormField name="pos-movement-amount" label="Monto" value={movementAmount} required placeholder="20.0000" onChange={(event) => setMovementAmount(event.target.value)} />
          <FormField name="pos-movement-reason" label="Motivo" value={movementReason} required onChange={(event) => setMovementReason(event.target.value)} />
          <Button type="submit" variant="secondary" busy={movementBusy} className="w-fit sm:col-span-3">
            Registrar movimiento
          </Button>
        </form>
      </div>

      <Modal
        open={closeModalOpen}
        onOpenChange={(open) => !closeBusy && setCloseModalOpen(open)}
        title="Cerrar turno"
        description="El sistema calcula el efectivo esperado a partir del fondo inicial, los movimientos y las ventas en efectivo de este turno."
        footer={
          <>
            <Button type="button" variant="quiet" disabled={closeBusy} onClick={() => setCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="pos-close-form" busy={closeBusy}>
              Cerrar turno
            </Button>
          </>
        }
      >
        <form
          id="pos-close-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void closeShift(event);
          }}
        >
          {closeError ? <ErrorNotice message={closeError} /> : null}
          <FormField name="pos-close-closingCashCounted" label="Efectivo contado" value={closingCashCounted} required placeholder="100.0000" onChange={(event) => setClosingCashCounted(event.target.value)} />
        </form>
      </Modal>

      {closedShift ? (
        <div className="grid gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--field)] p-5">
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Turno cerrado</p>
          <p className="text-[12px] text-[var(--muted-strong)]">
            Contado {closedShift.closingCashCounted} · Esperado {closedShift.closingCashExpected} · Diferencia {closedShift.cashVariance}
          </p>
          <Button type="button" variant="secondary" className="w-fit" onClick={onShiftClosed}>
            Volver a la caja
          </Button>
        </div>
      ) : null}
    </div>
  );
}
