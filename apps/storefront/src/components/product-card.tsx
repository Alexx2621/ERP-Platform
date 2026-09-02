import Link from "next/link";
import type { PublicProductSummaryResponse } from "@erp/api-client";
import { PlaceholderImage } from "./ui/placeholder-image";
import { Price } from "./ui/price";

export function ProductCard({ product }: { product: PublicProductSummaryResponse }) {
  return (
    <Link
      href={`/products/${encodeURIComponent(product.productId)}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--field)] transition-colors duration-150 hover:border-[var(--line-strong)]"
    >
      <PlaceholderImage label={product.name} className="aspect-square w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          {product.code}
        </span>
        <h3 className="text-[14px] font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          <Price amount={product.basePrice} />
        </div>
      </div>
    </Link>
  );
}
