import { ArrowLeft, ArrowUUpLeft, Receipt, ShoppingCartSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { ProductResponse, SupplierResponse, WarehouseResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { PurchaseOrdersPanel } from "./purchase-orders-panel";
import { PurchaseReturnsPanel } from "./purchase-returns-panel";
import { SupplierInvoicesPanel } from "./supplier-invoices-panel";
import { isAbortError, type WorkspaceSelection } from "./purchasing-shared";

interface PurchasingPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function PurchasingPage({ selection, navigate }: PurchasingPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Compras"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar compras." />
        </div>
      </ProductShell>
    );
  }

  return <PurchasingWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface PurchasingWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function PurchasingWorkspace({ selection, companyId, navigate }: PurchasingWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState("orders");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [suppliersResult, productsResult, warehousesResult] = await Promise.all([
          apiClient.listSuppliers(accessToken, selection.slug, companyId, signal),
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
          apiClient.listWarehouses(accessToken, selection.slug, companyId, signal),
        ]);
        setSuppliers(suppliersResult);
        setProducts(productsResult);
        setWarehouses(warehousesResult);
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Compras"
      description="Órdenes de compra, recepciones, devoluciones y facturas de proveedor de la empresa activa."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <div className="pt-7">
        {error ? (
          <div className="grid gap-3">
            <ErrorNotice message={error} />
            <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        ) : suppliers.length === 0 ? (
          <ErrorNotice message="Todavía no hay proveedores en esta empresa. Crea al menos uno en Contactos antes de comprar." />
        ) : (
          <Tabs
            ariaLabel="Administración de compras"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "orders",
                label: (
                  <span className="flex items-center gap-2">
                    <ShoppingCartSimple size={16} aria-hidden="true" />
                    Órdenes de compra
                  </span>
                ),
                panel: (
                  <PurchaseOrdersPanel
                    selection={selection}
                    companyId={companyId}
                    suppliers={suppliers}
                    products={products}
                    warehouses={warehouses}
                    active={activeTab === "orders"}
                  />
                ),
              },
              {
                id: "returns",
                label: (
                  <span className="flex items-center gap-2">
                    <ArrowUUpLeft size={16} aria-hidden="true" />
                    Devoluciones
                  </span>
                ),
                panel: (
                  <PurchaseReturnsPanel
                    selection={selection}
                    companyId={companyId}
                    products={products}
                    active={activeTab === "returns"}
                  />
                ),
              },
              {
                id: "invoices",
                label: (
                  <span className="flex items-center gap-2">
                    <Receipt size={16} aria-hidden="true" />
                    Facturas de proveedor
                  </span>
                ),
                panel: (
                  <SupplierInvoicesPanel
                    selection={selection}
                    companyId={companyId}
                    suppliers={suppliers}
                    active={activeTab === "invoices"}
                  />
                ),
              },
            ]}
          />
        )}
      </div>
    </ProductShell>
  );
}
