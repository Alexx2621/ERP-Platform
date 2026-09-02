import type { PublicProductSummaryResponse } from "@erp/api-client";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: PublicProductSummaryResponse[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-[var(--line-strong)] px-4 py-10 text-center text-[14px] font-medium text-[var(--muted-strong)]">
        Todavía no hay productos publicados en esta tienda.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.productId}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
