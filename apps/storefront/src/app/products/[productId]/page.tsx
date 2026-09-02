import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { getStorefrontCode } from "@/lib/env";
import { extractErrorMessage } from "@/lib/errors";
import { ProductDetail } from "@/components/product-detail";
import { ErrorBanner } from "@/components/ui/notice";

// Product data is live, per-tenant data — never statically baked in.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;

  try {
    const product = await apiClient.getPublicProduct(getStorefrontCode(), productId);
    return {
      title: product.name,
      description: product.description ?? `Detalle de ${product.name} en la tienda.`,
    };
  } catch {
    return { title: "Producto" };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { productId } = await params;

  try {
    const product = await apiClient.getPublicProduct(getStorefrontCode(), productId);
    return <ProductDetail product={product} />;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }

    return <ErrorBanner message={`No pudimos cargar este producto: ${extractErrorMessage(error)}`} />;
  }
}
