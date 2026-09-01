import { useCallback, useEffect, useState } from "react";
import type { CustomerResponse, ProductResponse, ProductVariantResponse, TaxResponse, TenantSummary, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { Select } from "../../shared/ui/select";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function customerLabel(customers: CustomerResponse[], customerId: string): string {
  const customer = customers.find((c) => c.id === customerId);
  return customer ? `${customer.name} (${customer.code})` : customerId;
}

export function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

const CHANNEL_LABELS: Record<string, string> = {
  ERP: "ERP",
  POS: "POS",
  ECOMMERCE: "E-commerce",
  B2B: "B2B",
  MARKETPLACE: "Marketplace",
  MOBILE: "Móvil",
  API: "API",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  CONVERTED: "Convertida",
  CANCELLED: "Cancelada",
};

export function quoteStatusLabel(status: string): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  FULFILLED: "Despachado",
  CANCELLED: "Cancelado",
};

export function salesOrderStatusLabel(status: string): string {
  return SALES_ORDER_STATUS_LABELS[status] ?? status;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  CAPTURED: "Cobrado",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
};

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK_TRANSFER: "Transferencia",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function statusToneClass(active: boolean): string {
  return active ? "text-[var(--accent)]" : "text-[var(--muted)]";
}

interface CustomerSelectProps {
  fieldPrefix: string;
  customers: CustomerResponse[];
  value: string;
  onChange: (id: string) => void;
}

export function CustomerSelect({ fieldPrefix, customers, value, onChange }: CustomerSelectProps) {
  return (
    <Select
      name={`${fieldPrefix}-customerId`}
      label="Cliente"
      value={value}
      required
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecciona un cliente</option>
      {customers.map((customer) => (
        <option key={customer.id} value={customer.id}>
          {customer.name} ({customer.code})
        </option>
      ))}
    </Select>
  );
}

/**
 * Shared by both the Quote-line and SalesOrder-line "add line" forms: a
 * product select, a lazily loaded variant select when `hasVariants`, and —
 * only when `requireWarehouse` — a warehouse select shown only for a
 * tracked-inventory product (mirrors `ResolveSalesLineTargetUseCase`'s own
 * server-side rule, so the UI never offers a combination the backend would
 * reject).
 */
interface LineTargetFieldsProps {
  fieldPrefix: string;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  productId: string;
  onProductIdChange: (id: string) => void;
  productVariantId: string;
  onProductVariantIdChange: (id: string) => void;
  warehouseId: string;
  onWarehouseIdChange: (id: string) => void;
  taxId: string;
  onTaxIdChange: (id: string) => void;
  requireWarehouse: boolean;
}

export function LineTargetFields({
  fieldPrefix,
  selection,
  companyId,
  products,
  warehouses,
  taxes,
  productId,
  onProductIdChange,
  productVariantId,
  onProductVariantIdChange,
  warehouseId,
  onWarehouseIdChange,
  taxId,
  onTaxIdChange,
  requireWarehouse,
}: LineTargetFieldsProps) {
  const { getAccessToken } = useAuth();
  const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);

  const loadVariants = useCallback(
    async (signal?: AbortSignal) => {
      if (!selectedProduct?.hasVariants) {
        setVariants([]);
        return;
      }
      setLoadingVariants(true);
      try {
        const accessToken = await getAccessToken();
        setVariants(await apiClient.listProductVariants(accessToken, selection.slug, companyId, selectedProduct.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    },
    [companyId, getAccessToken, selectedProduct, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadVariants(controller.signal);
    return () => controller.abort();
  }, [loadVariants]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name={`${fieldPrefix}-productId`}
          label="Producto"
          value={productId}
          required
          onChange={(event) => {
            onProductIdChange(event.target.value);
            onProductVariantIdChange("");
            onWarehouseIdChange("");
          }}
        >
          <option value="">Selecciona un producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.code})
            </option>
          ))}
        </Select>
        {selectedProduct?.hasVariants ? (
          <Select
            name={`${fieldPrefix}-productVariantId`}
            label="Variante"
            value={productVariantId}
            required
            disabled={loadingVariants}
            onChange={(event) => onProductVariantIdChange(event.target.value)}
          >
            <option value="">{loadingVariants ? "Cargando…" : "Selecciona una variante"}</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} ({Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(", ")})
              </option>
            ))}
          </Select>
        ) : null}
        {requireWarehouse && selectedProduct?.trackInventory ? (
          <Select
            name={`${fieldPrefix}-warehouseId`}
            label="Bodega"
            value={warehouseId}
            required
            onChange={(event) => onWarehouseIdChange(event.target.value)}
          >
            <option value="">Selecciona una bodega</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          name={`${fieldPrefix}-taxId`}
          label="Impuesto (opcional)"
          value={taxId}
          onChange={(event) => onTaxIdChange(event.target.value)}
        >
          <option value="">Sin impuesto</option>
          {taxes.map((tax) => (
            <option key={tax.id} value={tax.id}>
              {tax.name} ({tax.rate}%)
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
