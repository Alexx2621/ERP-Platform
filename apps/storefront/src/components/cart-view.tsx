"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CartResponse } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { clearStoredCartId, getStoredCartId } from "@/lib/cart-storage";
import { describeCartLine, useProductNames } from "@/lib/use-product-names";
import { extractErrorMessage } from "@/lib/errors";
import { formatMoney, formatQuantity } from "@/lib/format";
import { getStorefrontCode } from "@/lib/env";
import { Button } from "./ui/button";
import { ErrorBanner, InfoNotice } from "./ui/notice";

type LoadState = "loading" | "empty" | "ready" | "error";

export function CartView() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

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
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleUpdateQuantity(lineId: string, quantity: number) {
    if (!cart) {
      return;
    }

    setPendingLineId(lineId);
    setLineErrors((current) => ({ ...current, [lineId]: "" }));
    try {
      const updatedCart = await apiClient.updateCartLineQuantity(getStorefrontCode(), cart.id, lineId, {
        quantity: String(quantity),
      });
      setCart(updatedCart);
    } catch (error) {
      setLineErrors((current) => ({ ...current, [lineId]: extractErrorMessage(error) }));
    } finally {
      setPendingLineId(null);
    }
  }

  async function handleRemoveLine(lineId: string) {
    if (!cart) {
      return;
    }

    setPendingLineId(lineId);
    try {
      const updatedCart = await apiClient.removeCartLine(getStorefrontCode(), cart.id, lineId);
      setCart(updatedCart);
    } catch (error) {
      setLineErrors((current) => ({ ...current, [lineId]: extractErrorMessage(error) }));
    } finally {
      setPendingLineId(null);
    }
  }

  if (loadState === "loading") {
    return <p className="text-[14px] font-medium text-[var(--muted-strong)]">Cargando tu carrito...</p>;
  }

  if (loadState === "empty") {
    return (
      <div className="flex flex-col items-start gap-4">
        <InfoNotice>Todavía no tienes productos en tu carrito.</InfoNotice>
        <Link href="/">
          <Button variant="secondary">Ir a la tienda</Button>
        </Link>
      </div>
    );
  }

  if (loadState === "error" || !cart) {
    return (
      <div className="flex flex-col items-start gap-4">
        <ErrorBanner message={errorMessage ?? "No pudimos cargar tu carrito."} />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => loadCart()}>
            Reintentar
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              clearStoredCartId();
              setLoadState("empty");
            }}
          >
            Empezar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <InfoNotice>Todavía no tienes productos en tu carrito.</InfoNotice>
        <Link href="/">
          <Button variant="secondary">Ir a la tienda</Button>
        </Link>
      </div>
    );
  }

  const canCheckout = cart.status === "OPEN" && cart.lines.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {cart.status !== "OPEN" ? (
        <InfoNotice>
          Este carrito ya fue confirmado y no se puede modificar. Si quieres seguir comprando, vuelve
          a la tienda para agregar productos a un carrito nuevo.
        </InfoNotice>
      ) : null}

      <ul className="flex flex-col divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)]">
        {cart.lines.map((line) => {
          const { name, variantLabel } = describeCartLine(line, productsById);
          const busy = pendingLineId === line.id;

          return (
            <li key={line.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold text-[var(--ink)]">{name}</span>
                {variantLabel ? (
                  <span className="text-[12px] font-medium text-[var(--muted)]">{variantLabel}</span>
                ) : null}
                <span className="text-[12px] font-medium text-[var(--muted)]">
                  {formatMoney(line.unitPrice, cart.currency)} c/u
                </span>
                {lineErrors[line.id] ? (
                  <span role="alert" className="text-[12px] font-semibold text-[var(--danger)]">
                    {lineErrors[line.id]}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] font-bold text-[var(--ink)]">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={formatQuantity(line.quantity)}
                    disabled={busy || cart.status !== "OPEN"}
                    aria-label={`Cantidad de ${name}`}
                    onBlur={(event) => {
                      const nextQuantity = Math.max(1, Number(event.target.value) || 1);
                      if (String(nextQuantity) !== formatQuantity(line.quantity)) {
                        handleUpdateQuantity(line.id, nextQuantity);
                      }
                    }}
                    className="h-10 w-20 rounded-[8px] border border-[var(--line-strong)] bg-[var(--field)] px-2.5 text-[14px] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <span className="min-w-[80px] text-right text-[14px] font-extrabold text-[var(--ink)]">
                  {formatMoney(line.subtotal, cart.currency)}
                </span>
                <Button
                  variant="quiet"
                  busy={busy}
                  disabled={cart.status !== "OPEN"}
                  onClick={() => handleRemoveLine(line.id)}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-end gap-1 border-t border-[var(--line)] pt-4">
        <span className="text-[12px] font-semibold text-[var(--muted)]">
          Subtotal estimado — el total final se calcula al confirmar tu pedido
        </span>
        <span className="text-[20px] font-extrabold text-[var(--ink)]">
          {formatMoney(cart.subtotal, cart.currency)}
        </span>
      </div>

      <div className="flex justify-end">
        <Button disabled={!canCheckout} onClick={() => router.push("/checkout")}>
          Proceder al pago
        </Button>
      </div>
    </div>
  );
}
