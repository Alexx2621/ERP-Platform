import { useCallback, useEffect, useState } from "react";
import type { ProductResponse, ProductVariantResponse, SupplierResponse, TenantSummary, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { Select } from "../../shared/ui/select";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function supplierLabel(suppliers: SupplierResponse[], supplierId: string): string {
  const supplier = suppliers.find((s) => s.id === supplierId);
  return supplier ? `${supplier.name} (${supplier.code})` : supplierId;
}

export function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmada",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export function purchaseOrderStatusLabel(status: string): string {
  return PURCHASE_ORDER_STATUS_LABELS[status] ?? status;
}

const SUPPLIER_INVOICE_STATUS_LABELS: Record<string, string> = {
  RECORDED: "Registrada",
  CANCELLED: "Cancelada",
};

export function supplierInvoiceStatusLabel(status: string): string {
  return SUPPLIER_INVOICE_STATUS_LABELS[status] ?? status;
}

export function statusToneClass(active: boolean): string {
  return active ? "text-[var(--accent)]" : "text-[var(--muted)]";
}

interface SupplierSelectProps {
  fieldPrefix: string;
  suppliers: SupplierResponse[];
  value: string;
  onChange: (id: string) => void;
}

export function SupplierSelect({ fieldPrefix, suppliers, value, onChange }: SupplierSelectProps) {
  return (
    <Select
      name={`${fieldPrefix}-supplierId`}
      label="Proveedor"
      value={value}
      required
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecciona un proveedor</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name} ({supplier.code})
        </option>
      ))}
    </Select>
  );
}

/**
 * Shared by the "add order line" form: a product select, a lazily loaded
 * variant select when `hasVariants`, and a warehouse select shown only for
 * a tracked-inventory product — mirrors `ResolvePurchaseLineTargetUseCase`'s
 * own server-side rule, same pattern Sales' `LineTargetFields` established.
 */
interface LineTargetFieldsProps {
  fieldPrefix: string;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  productId: string;
  onProductIdChange: (id: string) => void;
  productVariantId: string;
  onProductVariantIdChange: (id: string) => void;
  warehouseId: string;
  onWarehouseIdChange: (id: string) => void;
}

export function LineTargetFields({
  fieldPrefix,
  selection,
  companyId,
  products,
  warehouses,
  productId,
  onProductIdChange,
  productVariantId,
  onProductVariantIdChange,
  warehouseId,
  onWarehouseIdChange,
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
      {selectedProduct?.trackInventory ? (
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
    </div>
  );
}
