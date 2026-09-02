"use client";

import { useEffect, useState } from "react";
import type { CartLineResponse, CartResponse, PublicProductDetailResponse } from "@erp/api-client";
import { apiClient } from "./api-client";
import { getStorefrontCode } from "./env";
import { formatVariantAttributes } from "./format";

/**
 * A cart line only carries `productId`/`productVariantId` — this resolves
 * each *unique* product a cart's lines reference (never one call per
 * line, so two lines sharing a product only cost one request) and hands
 * back the full product so callers can also look up a line's specific
 * variant. Shared by /cart and /checkout, the two places that need this.
 */
export function useProductNames(cart: CartResponse | null): {
  productsById: Record<string, PublicProductDetailResponse | null | undefined>;
  loading: boolean;
} {
  const [productsById, setProductsById] = useState<
    Record<string, PublicProductDetailResponse | null | undefined>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cart || cart.lines.length === 0) {
      return;
    }

    const uniqueProductIds = Array.from(new Set(cart.lines.map((line) => line.productId)));
    const missingProductIds = uniqueProductIds.filter((id) => !(id in productsById));
    if (missingProductIds.length === 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      missingProductIds.map(async (productId) => {
        try {
          const product = await apiClient.getPublicProduct(getStorefrontCode(), productId);
          return [productId, product] as const;
        } catch {
          // A product could have been unpublished after being added to the
          // cart — fall back to a generic label rather than failing the
          // whole cart/checkout view over one missing lookup.
          return [productId, null] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      setProductsById((current) => {
        const next = { ...current };
        for (const [productId, product] of results) {
          next[productId] = product;
        }
        return next;
      });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // Re-runs whenever the cart changes (new/removed lines) or once a batch
    // of lookups resolves (to pick up any productId a prior render hadn't
    // seen yet) — `missingProductIds.length === 0` above makes every other
    // invocation a no-op once everything currently in the cart is resolved.
  }, [cart, productsById]);

  return { productsById, loading };
}

/** Human label for one cart line, given the product lookup above. */
export function describeCartLine(
  line: CartLineResponse,
  productsById: Record<string, PublicProductDetailResponse | null | undefined>,
): { name: string; variantLabel: string | null } {
  const product = productsById[line.productId];

  if (product === undefined) {
    return { name: "Cargando...", variantLabel: null };
  }

  if (product === null) {
    return { name: "Producto no disponible", variantLabel: null };
  }

  const variant = line.productVariantId
    ? (product.variants.find((candidate) => candidate.id === line.productVariantId) ?? null)
    : null;

  if (!variant) {
    return { name: product.name, variantLabel: null };
  }

  const attributesLabel = formatVariantAttributes(variant.attributes);
  return { name: product.name, variantLabel: attributesLabel || variant.sku };
}
