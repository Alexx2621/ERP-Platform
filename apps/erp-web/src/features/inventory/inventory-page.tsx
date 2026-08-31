import { ArrowLeft, ArrowsLeftRight, BookmarkSimple, ClockCounterClockwise, Package } from "@phosphor-icons/react";
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
import { BalancesPanel } from "./inventory-balances-panel";
import { MovementsPanel } from "./inventory-movements-panel";
import { ReservationsPanel } from "./inventory-reservations-panel";
import { TransfersPanel } from "./inventory-transfers-panel";
import { isAbortError, type WorkspaceSelection } from "./inventory-shared";

interface InventoryPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function InventoryPage({ selection, navigate }: InventoryPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Inventario"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar el inventario." />
        </div>
      </ProductShell>
    );
  }

  return <InventoryWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface InventoryWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function InventoryWorkspace({ selection, companyId, navigate }: InventoryWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState("balances");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [warehousesResult, productsResult] = await Promise.all([
          apiClient.listWarehouses(accessToken, selection.slug, companyId, signal),
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
        ]);
        setWarehouses(warehousesResult);
        setProducts(productsResult);
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
      title="Inventario"
      description="Existencias, movimientos, reservas y transferencias de la empresa activa."
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
        ) : warehouses.length === 0 ? (
          <ErrorNotice message="Todavía no hay bodegas en esta empresa. Crea al menos una bodega en Comercial antes de registrar movimientos de inventario." />
        ) : (
          <Tabs
            ariaLabel="Administración de inventario"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "balances",
                label: (
                  <span className="flex items-center gap-2">
                    <Package size={16} aria-hidden="true" />
                    Existencias
                  </span>
                ),
                panel: (
                  <BalancesPanel
                    selection={selection}
                    companyId={companyId}
                    warehouses={warehouses}
                    products={products}
                    active={activeTab === "balances"}
                  />
                ),
              },
              {
                id: "movements",
                label: (
                  <span className="flex items-center gap-2">
                    <ClockCounterClockwise size={16} aria-hidden="true" />
                    Movimientos
                  </span>
                ),
                panel: (
                  <MovementsPanel
                    selection={selection}
                    companyId={companyId}
                    warehouses={warehouses}
                    products={products}
                    active={activeTab === "movements"}
                  />
                ),
              },
              {
                id: "reservations",
                label: (
                  <span className="flex items-center gap-2">
                    <BookmarkSimple size={16} aria-hidden="true" />
                    Reservas
                  </span>
                ),
                panel: (
                  <ReservationsPanel
                    selection={selection}
                    companyId={companyId}
                    warehouses={warehouses}
                    products={products}
                    active={activeTab === "reservations"}
                  />
                ),
              },
              {
                id: "transfers",
                label: (
                  <span className="flex items-center gap-2">
                    <ArrowsLeftRight size={16} aria-hidden="true" />
                    Transferencias
                  </span>
                ),
                panel: (
                  <TransfersPanel
                    selection={selection}
                    companyId={companyId}
                    warehouses={warehouses}
                    products={products}
                    active={activeTab === "transfers"}
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
