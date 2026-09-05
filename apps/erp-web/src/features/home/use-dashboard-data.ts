import { useCallback, useEffect, useState } from "react";
import type {
  CommerceOrderResponse,
  CustomerResponse,
  InventoryBalanceResponse,
  PaymentResponse,
  PipelineSummaryResponse,
  PosSaleResponse,
  ProductResponse,
  ProductionOrderResponse,
  PurchaseOrderResponse,
  SalesOrderResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";

interface DashboardSelection {
  slug: string;
  companyId?: string;
}

export interface DashboardData {
  customers: CustomerResponse[] | null;
  products: ProductResponse[] | null;
  salesOrders: SalesOrderResponse[] | null;
  payments: PaymentResponse[] | null;
  purchaseOrders: PurchaseOrderResponse[] | null;
  posSales: PosSaleResponse[] | null;
  pipelineSummary: PipelineSummaryResponse | null;
  productionOrders: ProductionOrderResponse[] | null;
  inventoryBalances: InventoryBalanceResponse[] | null;
  commerceOrders: CommerceOrderResponse[] | null;
}

const EMPTY_DATA: DashboardData = {
  customers: null,
  products: null,
  salesOrders: null,
  payments: null,
  purchaseOrders: null,
  posSales: null,
  pipelineSummary: null,
  productionOrders: null,
  inventoryBalances: null,
  commerceOrders: null,
};

/**
 * Fires every list call the home dashboard's widgets need, in parallel, via
 * Promise.allSettled — deliberately never a single Promise.all. A tenant
 * with one module disabled (docs/DECISIONS.md ADR-015's AppEnablementGuard)
 * or a user missing a single module's read permission must not blank out
 * every other widget on a shared dashboard; each data source resolves to
 * null on its own failure instead of rejecting the whole batch. A widget
 * whose source is null renders "No disponible" (see widget-definitions.tsx)
 * instead of a fabricated zero.
 */
export function useDashboardData(selection: DashboardSelection) {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!selection.companyId) {
        setData(EMPTY_DATA);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const accessToken = await getAccessToken();
      const { slug } = selection;
      const companyId = selection.companyId;

      const [
        customers,
        products,
        salesOrders,
        payments,
        purchaseOrders,
        posSales,
        pipelines,
        productionOrders,
        inventoryBalances,
        commerceOrders,
      ] = await Promise.allSettled([
        apiClient.listCustomers(accessToken, slug, companyId, signal),
        apiClient.listProducts(accessToken, slug, companyId, signal),
        apiClient.listSalesOrders(accessToken, slug, companyId, { limit: 200 }, signal),
        apiClient.listPayments(accessToken, slug, companyId, { limit: 200 }, signal),
        apiClient.listPurchaseOrders(accessToken, slug, companyId, { limit: 200 }, signal),
        apiClient.listPosSales(accessToken, slug, companyId, { limit: 200 }, signal),
        apiClient.listPipelines(accessToken, slug, companyId, signal),
        apiClient.listProductionOrders(accessToken, slug, companyId, { limit: 200 }, signal),
        apiClient.listInventoryBalances(accessToken, slug, companyId, {}, signal),
        apiClient.listCommerceOrders(accessToken, slug, companyId, { limit: 200 }, signal),
      ]);

      // The pipeline summary needs a second call keyed off the first real
      // pipeline's id, resolved independently so a tenant with zero
      // pipelines (or a failed first call) never blocks anything else.
      let pipelineSummary: PipelineSummaryResponse | null = null;
      if (pipelines.status === "fulfilled" && pipelines.value.length > 0) {
        try {
          pipelineSummary = await apiClient.getPipelineSummary(
            accessToken,
            slug,
            companyId,
            pipelines.value[0].id,
            signal,
          );
        } catch {
          pipelineSummary = null;
        }
      }

      if (signal.aborted) {
        return;
      }
      setData({
        customers: customers.status === "fulfilled" ? customers.value : null,
        products: products.status === "fulfilled" ? products.value : null,
        salesOrders: salesOrders.status === "fulfilled" ? salesOrders.value : null,
        payments: payments.status === "fulfilled" ? payments.value : null,
        purchaseOrders: purchaseOrders.status === "fulfilled" ? purchaseOrders.value : null,
        posSales: posSales.status === "fulfilled" ? posSales.value : null,
        pipelineSummary,
        productionOrders: productionOrders.status === "fulfilled" ? productionOrders.value : null,
        inventoryBalances: inventoryBalances.status === "fulfilled" ? inventoryBalances.value : null,
        commerceOrders: commerceOrders.status === "fulfilled" ? commerceOrders.value : null,
      });
      setIsLoading(false);
    },
    [getAccessToken, selection.companyId, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, isLoading };
}
