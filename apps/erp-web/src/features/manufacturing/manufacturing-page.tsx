import { ArrowLeft, Factory, ListDashes } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { BillOfMaterialResponse, ProductResponse, WarehouseResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { BillsOfMaterialPanel } from "./bills-of-material-panel";
import { ProductionOrdersPanel } from "./production-orders-panel";
import { isAbortError, type WorkspaceSelection } from "./manufacturing-shared";

interface ManufacturingPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function ManufacturingPage({ selection, navigate }: ManufacturingPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Manufactura"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar manufactura." />
        </div>
      </ProductShell>
    );
  }

  return <ManufacturingWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface ManufacturingWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function ManufacturingWorkspace({ selection, companyId, navigate }: ManufacturingWorkspaceProps) {
  const { getAccessToken } = useAuth();
  // Bills of material, products and warehouses are loaded once here,
  // unconditionally — not lazily per tab — because the Órdenes de
  // producción tab needs the same BOM/product/warehouse lists for its
  // selects regardless of which tab is active by default. Same lesson
  // POS's own register list already found and fixed (session 30), applied
  // proactively here.
  const [billsOfMaterial, setBillsOfMaterial] = useState<BillOfMaterialResponse[] | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [bomError, setBomError] = useState<string>();
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState("boms");

  const loadBillsOfMaterial = useCallback(
    async (signal?: AbortSignal) => {
      setBomError(undefined);
      try {
        const accessToken = await getAccessToken();
        setBillsOfMaterial(await apiClient.listBillsOfMaterial(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setBomError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadStatic = useCallback(
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
    void loadBillsOfMaterial(controller.signal);
    void loadStatic(controller.signal);
    return () => controller.abort();
  }, [loadBillsOfMaterial, loadStatic]);

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Manufactura"
      description="Listas de materiales y órdenes de producción de la empresa activa."
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
            <Button type="button" variant="secondary" className="w-fit" onClick={() => void loadStatic()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <Tabs
            ariaLabel="Administración de manufactura"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "boms",
                label: (
                  <span className="flex items-center gap-2">
                    <ListDashes size={16} aria-hidden="true" />
                    Listas de materiales
                  </span>
                ),
                panel: (
                  <BillsOfMaterialPanel
                    selection={selection}
                    companyId={companyId}
                    billsOfMaterial={billsOfMaterial}
                    products={products}
                    error={bomError}
                    onRetry={() => void loadBillsOfMaterial()}
                    onBillsOfMaterialChanged={(updater) => setBillsOfMaterial(updater)}
                  />
                ),
              },
              {
                id: "orders",
                label: (
                  <span className="flex items-center gap-2">
                    <Factory size={16} aria-hidden="true" />
                    Órdenes de producción
                  </span>
                ),
                panel: (
                  <ProductionOrdersPanel
                    selection={selection}
                    companyId={companyId}
                    billsOfMaterial={billsOfMaterial ?? []}
                    products={products}
                    warehouses={warehouses}
                    active={activeTab === "orders"}
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
