import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { getStorefrontCode } from "@/lib/env";
import { extractErrorMessage } from "@/lib/errors";
import { OrderConfirmation } from "@/components/order-confirmation";
import { ErrorBanner } from "@/components/ui/notice";

// Order data is per-shopper and must never be cached/shared across
// requests or baked into a static build artifact.
export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

export const metadata: Metadata = {
  title: "Confirmación de pedido",
};

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  try {
    const order = await apiClient.getPublicOrder(getStorefrontCode(), orderId);
    return <OrderConfirmation order={order} />;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }

    return <ErrorBanner message={`No pudimos cargar este pedido: ${extractErrorMessage(error)}`} />;
  }
}
