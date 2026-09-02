"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CartResponse, CheckoutInput } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { clearStoredCartId, getStoredCartId } from "@/lib/cart-storage";
import { extractErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { getStorefrontCode } from "@/lib/env";
import { addRecentOrder } from "@/lib/orders-storage";
import { describeCartLine, useProductNames } from "@/lib/use-product-names";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { ErrorBanner, InfoNotice } from "./ui/notice";

type LoadState = "loading" | "empty" | "ready" | "error";

export function CheckoutView() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { productsById } = useProductNames(cart);

  const loadCart = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) {
      setLoadState("empty");
      return;
    }

    setLoadState("loading");
    try {
      const loadedCart = await apiClient.getCart(getStorefrontCode(), cartId);
      setCart(loadedCart);
      setLoadState(loadedCart.lines.length === 0 || loadedCart.status !== "OPEN" ? "empty" : "ready");
    } catch (error) {
      setLoadErrorMessage(extractErrorMessage(error));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const trimmedReference = paymentReference.trim();
    const input: CheckoutInput = {
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      ...(trimmedReference ? { paymentReference: trimmedReference } : {}),
    };

    try {
      const order = await apiClient.checkout(getStorefrontCode(), cart.id, input);
      clearStoredCartId();
      addRecentOrder(order.id);
      router.push(`/orders/${encodeURIComponent(order.id)}`);
    } catch (error) {
      setSubmitError(extractErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return <p className="text-[14px] font-medium text-[var(--muted-strong)]">Cargando tu pedido...</p>;
  }

  if (loadState === "empty") {
    return (
      <div className="flex flex-col items-start gap-4">
        <InfoNotice>
          No tienes un carrito activo con productos. Ve a la tienda para agregar productos antes de
          pagar.
        </InfoNotice>
        <Link href="/">
          <Button variant="secondary">Ir a la tienda</Button>
        </Link>
      </div>
    );
  }

  if (loadState === "error" || !cart) {
    return (
      <div className="flex flex-col items-start gap-4">
        <ErrorBanner message={loadErrorMessage ?? "No pudimos cargar tu carrito."} />
        <Button variant="secondary" onClick={() => loadCart()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          label="Nombre completo"
          name="guestName"
          type="text"
          autoComplete="name"
          required
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
        <Field
          label="Correo electrónico"
          name="guestEmail"
          type="email"
          autoComplete="email"
          required
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
        />
        <Field
          label="Referencia de transferencia bancaria (opcional)"
          name="paymentReference"
          type="text"
          hint="Pago por transferencia bancaria — si ya hiciste la transferencia, ingresa la referencia que te dio tu banco; si prefieres, puedes dejarlo en blanco y confirmaremos tu pago manualmente."
          value={paymentReference}
          onChange={(event) => setPaymentReference(event.target.value)}
        />

        {submitError ? <ErrorBanner message={submitError} /> : null}

        <Button type="submit" busy={submitting} className="w-full sm:w-auto">
          Confirmar pedido
        </Button>
      </form>

      <aside className="flex flex-col gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="text-[14px] font-extrabold text-[var(--ink)]">Resumen del pedido</h2>
        <ul className="flex flex-col gap-3">
          {cart.lines.map((line) => {
            const { name, variantLabel } = describeCartLine(line, productsById);
            return (
              <li key={line.id} className="flex items-start justify-between gap-3 text-[13px]">
                <div className="flex flex-col">
                  <span className="font-bold text-[var(--ink)]">{name}</span>
                  {variantLabel ? <span className="text-[var(--muted)]">{variantLabel}</span> : null}
                  <span className="text-[var(--muted)]">Cantidad: {line.quantity}</span>
                </div>
                <span className="font-bold text-[var(--ink)]">{formatMoney(line.subtotal, cart.currency)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="text-[13px] font-semibold text-[var(--muted-strong)]">Subtotal estimado</span>
          <span className="text-[16px] font-extrabold text-[var(--ink)]">
            {formatMoney(cart.subtotal, cart.currency)}
          </span>
        </div>
      </aside>
    </div>
  );
}
