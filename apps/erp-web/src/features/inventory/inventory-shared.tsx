import { useCallback, useEffect, useState } from "react";
import type { ProductResponse, ProductVariantResponse, TenantSummary, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { Select } from "../../shared/ui/select";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface WarehouseSelectProps {
  fieldPrefix: string;
  label: string;
  warehouses: WarehouseResponse[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}

export function WarehouseSelect({ fieldPrefix, label, warehouses, value, onChange, required }: WarehouseSelectProps) {
  return (
    <Select
      name={`${fieldPrefix}-warehouseId`}
      label={label}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecciona una bodega</option>
      {warehouses.map((warehouse) => (
        <option key={warehouse.id} value={warehouse.id}>
          {warehouse.name} ({warehouse.code})
        </option>
      ))}
    </Select>
  );
}

/**
 * Shared by every form that needs to target one sellable unit (Receipt,
 * Issue, Adjustment, Reservation creation, Transfer creation): a product
 * select, plus — only when the chosen product `hasVariants` — a lazily
 * loaded variant select. Every one of those five forms needs the exact
 * same "pick a product, then its variant if it has one" behavior, so this
 * is real duplication removed, not a speculative abstraction.
 */
interface ProductAndVariantFieldsProps {
  fieldPrefix: string;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  productId: string;
  onProductIdChange: (id: string) => void;
  productVariantId: string;
  onProductVariantIdChange: (id: string) => void;
  /** Only products with inventory tracking enabled make sense as a movement/reservation/transfer target. */
  trackedOnly?: boolean;
}

export function ProductAndVariantFields({
  fieldPrefix,
  selection,
  companyId,
  products,
  productId,
  onProductIdChange,
  productVariantId,
  onProductVariantIdChange,
  trackedOnly = true,
}: ProductAndVariantFieldsProps) {
  const { getAccessToken } = useAuth();
  const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const selectableProducts = trackedOnly ? products.filter((product) => product.trackInventory) : products;
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
        }}
      >
        <option value="">Selecciona un producto</option>
        {selectableProducts.map((product) => (
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
    </div>
  );
}
