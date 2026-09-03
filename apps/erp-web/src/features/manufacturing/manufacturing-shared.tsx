import { useCallback, useEffect, useState } from "react";
import type { ProductResponse, ProductVariantResponse, TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { Select } from "../../shared/ui/select";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

const BOM_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export function billOfMaterialStatusLabel(status: string): string {
  return BOM_STATUS_LABELS[status] ?? status;
}

const PRODUCTION_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmada",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export function productionOrderStatusLabel(status: string): string {
  return PRODUCTION_ORDER_STATUS_LABELS[status] ?? status;
}

export function statusToneClass(active: boolean): string {
  return active ? "text-[var(--accent)]" : "text-[var(--muted)]";
}

/**
 * A product select plus a lazily loaded variant select when `hasVariants`
 * — deliberately no warehouse select here, unlike Purchasing/Sales'
 * `LineTargetFields`: a BOM component's warehouse is always the production
 * order's own single warehouse, resolved server-side, never chosen per
 * component (docs/DECISIONS.md ADR-014).
 */
interface ProductSelectFieldsProps {
  fieldPrefix: string;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  productId: string;
  onProductIdChange: (id: string) => void;
  productVariantId: string;
  onProductVariantIdChange: (id: string) => void;
  label?: string;
  /**
   * Defaults to `true` for a normal single-value field. A draft-add mini-form
   * (add one component/line, then clear it back to "" to add the next one)
   * must pass `false` here — a `required` field left empty after being reset
   * silently blocks the *outer* form's native submit event in every browser
   * (and jsdom), with no thrown exception and no onSubmit call at all, since
   * validity here is already enforced by disabling the "Agregar" button.
   */
  required?: boolean;
}

export function ProductSelectFields({
  fieldPrefix,
  selection,
  companyId,
  products,
  productId,
  onProductIdChange,
  productVariantId,
  onProductVariantIdChange,
  label = "Producto",
  required = true,
}: ProductSelectFieldsProps) {
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
        label={label}
        value={productId}
        required={required}
        onChange={(event) => {
          onProductIdChange(event.target.value);
          onProductVariantIdChange("");
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
          required={required}
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
