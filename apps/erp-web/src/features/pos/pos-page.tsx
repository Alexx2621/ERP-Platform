import { ArrowLeft, Storefront, Coins, ShoppingCartSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { CustomerResponse, PosRegisterResponse, ProductResponse, TaxResponse, WarehouseResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { PosRegistersPanel } from "./pos-registers-panel";
import { PosSalesPanel } from "./pos-sales-panel";
import { PosTerminalPanel } from "./pos-terminal-panel";
import { isAbortError, type WorkspaceSelection } from "./pos-shared";

interface PosPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function PosPage({ selection, navigate }: PosPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Punto de venta"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para usar el punto de venta." />
        </div>
      </ProductShell>
    );
  }

  return <PosWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface PosWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function PosWorkspace({ selection, companyId, navigate }: PosWorkspaceProps) {
  const { getAccessToken } = useAuth();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [taxes, setTaxes] = useState<TaxResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [registers, setRegisters] = useState<PosRegisterResponse[]>([]);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState("terminal");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [customersResult, productsResult, taxesResult, warehousesResult, registersResult] = await Promise.all([
          apiClient.listCustomers(accessToken, selection.slug, companyId, signal),
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
          apiClient.listTaxes(accessToken, selection.slug, companyId, signal),
          apiClient.listWarehouses(accessToken, selection.slug, companyId, signal),
          apiClient.listPosRegisters(accessToken, selection.slug, companyId, {}, signal),
        ]);
        setCustomers(customersResult);
        setProducts(productsResult);
        setTaxes(taxesResult);
        setWarehouses(warehousesResult);
        setRegisters(registersResult);
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
      title="Punto de venta"
      description="Cajas, turnos, ventas de mostrador y devoluciones de la empresa activa."
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
        ) : customers.length === 0 ? (
          <ErrorNotice message="Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos antes de vender." />
        ) : (
          <Tabs
            ariaLabel="Administración del punto de venta"
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                id: "terminal",
                label: (
                  <span className="flex items-center gap-2">
                    <Storefront size={16} aria-hidden="true" />
                    Vender
                  </span>
                ),
                panel: (
                  <PosTerminalPanel
                    selection={selection}
                    companyId={companyId}
                    registers={registers}
                    customers={customers}
                    products={products}
                    taxes={taxes}
                    active={activeTab === "terminal"}
                  />
                ),
              },
              {
                id: "registers",
                label: (
                  <span className="flex items-center gap-2">
                    <Coins size={16} aria-hidden="true" />
                    Cajas
                  </span>
                ),
                panel: (
                  <PosRegistersPanel
                    selection={selection}
                    companyId={companyId}
                    warehouses={warehouses}
                    registers={registers}
                    onRegistersChange={setRegisters}
                  />
                ),
              },
              {
                id: "sales",
                label: (
                  <span className="flex items-center gap-2">
                    <ShoppingCartSimple size={16} aria-hidden="true" />
                    Ventas
                  </span>
                ),
                panel: <PosSalesPanel selection={selection} companyId={companyId} products={products} active={activeTab === "sales"} />,
              },
            ]}
          />
        )}
      </div>
    </ProductShell>
  );
}
