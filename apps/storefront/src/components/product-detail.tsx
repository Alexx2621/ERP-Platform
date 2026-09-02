"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AddCartLineInput, PublicProductDetailResponse } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { getStoredCartId, setStoredCartId } from "@/lib/cart-storage";
import { extractErrorMessage } from "@/lib/errors";
import { formatVariantAttributes } from "@/lib/format";
import { getStorefrontCode } from "@/lib/env";
import { Button } from "./ui/button";
import { ErrorBanner, SuccessBanner } from "./ui/notice";
import { PlaceholderImage } from "./ui/placeholder-image";
import { Price } from "./ui/price";
import { SelectField } from "./ui/select-field";

type Status = "idle" | "adding" | "success" | "error";

function describeVariant(variant: PublicProductDetailResponse["variants"][number]): string {
  const attributesLabel = formatVariantAttributes(variant.attributes);
  return attributesLabel ? `${variant.sku} (${attributesLabel})` : variant.sku;
}

export function ProductDetail({ product }: { product: PublicProductDetailResponse }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [product.variants, selectedVariantId],
  );

  const displayedPrice = product.hasVariants ? (selectedVariant?.price ?? null) : product.basePrice;
  const canAddToCart = product.hasVariants ? Boolean(selectedVariant) : true;

  async function handleAddToCart() {
    if (!canAddToCart) {
      return;
    }

    setStatus("adding");
    setErrorMessage(null);

    try {
      let cartId = getStoredCartId();
      if (!cartId) {
        const cart = await apiClient.createCart(getStorefrontCode());
        cartId = cart.id;
        setStoredCartId(cartId);
      }

      const input: AddCartLineInput = {
        productId: product.productId,
        quantity: String(quantity),
        ...(product.hasVariants && selectedVariant ? { productVariantId: selectedVariant.id } : {}),
      };

      await apiClient.addCartLine(getStorefrontCode(), cartId, input);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(extractErrorMessage(error));
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <PlaceholderImage label={product.name} className="aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            {product.code}
          </span>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight text-[var(--ink)]">
            {product.name}
          </h1>
        </div>

        {product.description ? (
          <p className="text-[14px] leading-6 text-[var(--muted-strong)]">{product.description}</p>
        ) : null}

        <div className="text-[20px]">
          <Price amount={displayedPrice} />
        </div>

        {product.hasVariants ? (
          product.variants.length > 0 ? (
            <SelectField
              label="Variante"
              name="variant"
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {describeVariant(variant)}
                </option>
              ))}
            </SelectField>
          ) : (
            <ErrorBanner message="Este producto todavía no tiene variantes disponibles." />
          )
        ) : null}

        <label className="grid max-w-[140px] gap-1.5 text-[13px] font-bold text-[var(--ink)]" htmlFor="quantity">
          Cantidad
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="h-11 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 text-[14px] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        </label>

        <div className="flex flex-col gap-3">
          <Button
            busy={status === "adding"}
            disabled={!canAddToCart}
            onClick={handleAddToCart}
            className="w-full sm:w-auto"
          >
            Agregar al carrito
          </Button>

          {status === "success" ? (
            <SuccessBanner>
              Producto agregado al carrito.{" "}
              <Link href="/cart" className="underline underline-offset-2">
                Ver carrito
              </Link>
              .
            </SuccessBanner>
          ) : null}

          {status === "error" && errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        </div>
      </div>
    </div>
  );
}
