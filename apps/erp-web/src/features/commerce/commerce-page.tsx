import { ArrowLeft, Package, Storefront as StorefrontIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { ProductResponse, WarehouseResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { CommerceOrdersPanel } from "./commerce-orders-panel";
import { StorefrontsPanel } from "./storefronts-panel";
import { isAbortError, type WorkspaceSelection } from "./commerce-shared";

interface CommercePageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function CommercePage({ selection, navigate }: CommercePageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Comercio"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar el comercio en línea." />
        </div>
      </ProductShell>
    );
  }

  return <CommerceWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface CommerceWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function CommerceWorkspace({ selection, companyId, navigate }: CommerceWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState("storefronts");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [productsResult, warehousesResult] = await Promise.all([
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
          apiClient.listWarehouses(accessToken, selection.slug, companyId, signal),
        ]);
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
      title="Comercio"
      description="Tiendas en línea, catálogo publicado y pedidos de la empresa activa (Fase 7 — Commerce Engine)."
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
        ) : (
          <Tabs
            ariaLabel="Administración de comercio"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "storefronts",
                label: (
                  <span className="flex items-center gap-2">
                    <StorefrontIcon size={16} aria-hidden="true" />
                    Tiendas
                  </span>
                ),
                panel: (
                  <StorefrontsPanel
                    selection={selection}
                    companyId={companyId}
                    products={products}
                    warehouses={warehouses}
                    active={activeTab === "storefronts"}
                  />
                ),
              },
              {
                id: "orders",
                label: (
                  <span className="flex items-center gap-2">
                    <Package size={16} aria-hidden="true" />
                    Pedidos
                  </span>
                ),
                panel: <CommerceOrdersPanel selection={selection} companyId={companyId} active={activeTab === "orders"} />,
              },
            ]}
          />
        )}
      </div>
    </ProductShell>
  );
}
