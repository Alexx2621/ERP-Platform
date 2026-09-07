import { ArrowLeft, ArrowUUpLeft, FileText, ShoppingCartSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { CustomerResponse, ProductResponse, TaxResponse, WarehouseResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice, SetupNotice } from "../../shared/ui/notice";
import { PageLoading } from "../../shared/ui/page-loading";
import { Tabs } from "../../shared/ui/tabs";
import { QuotesPanel } from "./quotes-panel";
import { SalesOrderEditor } from "./sales-order-editor";
import { SalesOrdersPanel } from "./sales-orders-panel";
import { SalesReturnsPanel } from "./sales-returns-panel";
import { isAbortError, type WorkspaceSelection } from "./sales-shared";

interface SalesPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function SalesPage({ selection, navigate }: SalesPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Ventas"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar ventas." />
        </div>
      </ProductShell>
    );
  }

  return <SalesWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface SalesWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function SalesWorkspace({ selection, companyId, navigate }: SalesWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [taxes, setTaxes] = useState<TaxResponse[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("quotes");
  // `undefined` = list view; `null` = a blank editor; a string = that order.
  const [editorOrderId, setEditorOrderId] = useState<string | null | undefined>(undefined);
  const [ordersReloadToken, setOrdersReloadToken] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      setIsLoading(true);
      try {
        const accessToken = await getAccessToken();
        const [customersResult, productsResult, warehousesResult, taxesResult] = await Promise.all([
          apiClient.listCustomers(accessToken, selection.slug, companyId, signal),
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
          apiClient.listWarehouses(accessToken, selection.slug, companyId, signal),
          apiClient.listTaxes(accessToken, selection.slug, companyId, signal),
        ]);
        setCustomers(customersResult);
        setProducts(productsResult);
        setWarehouses(warehousesResult);
        setTaxes(taxesResult);
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
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
      title="Ventas"
      description="Cotizaciones, pedidos, pagos y devoluciones de la empresa activa."
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
        ) : isLoading ? (
          <PageLoading />
        ) : customers.length === 0 ? (
          <SetupNotice
            title="Primero necesitas un cliente"
            description="Cada cotización y pedido de venta se registra a nombre de un cliente. Crea al menos uno en Contactos para empezar a vender."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate("/contacts")}>
                Ir a Contactos
              </Button>
            }
          />
        ) : editorOrderId !== undefined ? (
          <SalesOrderEditor
            selection={selection}
            companyId={companyId}
            customers={customers}
            products={products}
            warehouses={warehouses}
            taxes={taxes}
            orderId={editorOrderId}
            onClose={() => setEditorOrderId(undefined)}
            onOrderChanged={() => setOrdersReloadToken((token) => token + 1)}
          />
        ) : (
          <Tabs
            ariaLabel="Administración de ventas"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "quotes",
                label: (
                  <span className="flex items-center gap-2">
                    <FileText size={16} aria-hidden="true" />
                    Cotizaciones
                  </span>
                ),
                panel: (
                  <QuotesPanel
                    selection={selection}
                    companyId={companyId}
                    customers={customers}
                    products={products}
                    warehouses={warehouses}
                    taxes={taxes}
                    active={activeTab === "quotes"}
                    onConverted={(order) => {
                      // Converting a quote lands the user directly in the
                      // resulting order, instead of leaving them to find it.
                      setActiveTab("orders");
                      setEditorOrderId(order.id);
                    }}
                  />
                ),
              },
              {
                id: "orders",
                label: (
                  <span className="flex items-center gap-2">
                    <ShoppingCartSimple size={16} aria-hidden="true" />
                    Pedidos
                  </span>
                ),
                panel: (
                  <SalesOrdersPanel
                    selection={selection}
                    companyId={companyId}
                    customers={customers}
                    active={activeTab === "orders"}
                    onOpenEditor={setEditorOrderId}
                    reloadToken={ordersReloadToken}
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
                  <SalesReturnsPanel
                    selection={selection}
                    companyId={companyId}
                    products={products}
                    active={activeTab === "returns"}
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
