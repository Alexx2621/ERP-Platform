import { apiClient } from "@/lib/api-client";
import { getStorefrontCode } from "@/lib/env";
import { extractErrorMessage } from "@/lib/errors";
import { ProductCatalog } from "@/components/product-catalog";
import { RecentOrders } from "@/components/recent-orders";
import { ErrorBanner } from "@/components/ui/notice";

// Product prices/availability are live, per-tenant data — never bake this
// page into a static build artifact (also avoids `next build` trying to
// reach a live backend at build time, which isn't guaranteed to exist).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const products = await apiClient.listPublicProducts(getStorefrontCode());
    return (
      <div className="flex flex-col gap-8">
        <RecentOrders />
        <ProductCatalog products={products} />
      </div>
    );
  } catch (error) {
    return <ErrorBanner message={`No pudimos cargar la tienda: ${extractErrorMessage(error)}`} />;
  }
}
