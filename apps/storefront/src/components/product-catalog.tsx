"use client";

import { useMemo, useState } from "react";
import type { PublicProductSummaryResponse } from "@erp/api-client";
import { ProductGrid } from "./product-grid";

/**
 * A simple client-side filter over the products the server already
 * fetched — per docs/ROADMAP.md §11 ("Search inicial PostgreSQL"), search
 * here is just what `listPublicProducts` already returns, not a new
 * search endpoint or Elasticsearch.
 */
export function ProductCatalog({ products }: { products: PublicProductSummaryResponse[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.code.toLowerCase().includes(normalized),
    );
  }, [products, query]);

  return (
    <div className="flex flex-col gap-6">
      {products.length > 0 ? (
        <div className="max-w-sm">
          <label className="grid gap-1.5 text-[13px] font-bold text-[var(--ink)]" htmlFor="product-filter">
            Buscar productos
            <input
              id="product-filter"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre o código..."
              className="h-11 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 text-[14px] font-medium text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
        </div>
      ) : null}
      {query.trim() && filtered.length === 0 ? (
        <p className="text-[14px] font-medium text-[var(--muted-strong)]">
          No encontramos productos que coincidan con &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ProductGrid products={filtered} />
      )}
    </div>
  );
}
