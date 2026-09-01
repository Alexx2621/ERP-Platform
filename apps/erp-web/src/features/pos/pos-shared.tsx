import { useCallback, useEffect, useState } from "react";
import type { CustomerResponse, ProductResponse, ProductVariantResponse, TaxResponse, TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { Select } from "../../shared/ui/select";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** One idempotency key per logical terminal attempt — a retry with the same key never rings up/returns a second time. */
export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function customerLabel(customers: CustomerResponse[], customerId: string): string {
  const customer = customers.find((c) => c.id === customerId);
  return customer ? `${customer.name} (${customer.code})` : customerId;
}

export function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

const REGISTER_STATUS_LABELS: Record<string, string> = { ACTIVE: "Activa", INACTIVE: "Inactiva" };
export function registerStatusLabel(status: string): string {
  return REGISTER_STATUS_LABELS[status] ?? status;
}

const SHIFT_STATUS_LABELS: Record<string, string> = { OPEN: "Abierto", CLOSED: "Cerrado" };
export function shiftStatusLabel(status: string): string {
  return SHIFT_STATUS_LABELS[status] ?? status;
}

const CASH_MOVEMENT_TYPE_LABELS: Record<string, string> = { CASH_IN: "Ingreso", CASH_OUT: "Egreso" };
export function cashMovementTypeLabel(type: string): string {
  return CASH_MOVEMENT_TYPE_LABELS[type] ?? type;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = { CASH: "Efectivo", BANK_TRANSFER: "Transferencia" };
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
    <Select name={`${fieldPrefix}-customerId`} label="Cliente" value={value} required onChange={(event) => onChange(event.target.value)}>
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
 * A cart line's product target — product + variant (when `hasVariants`) +
 * an optional tax. Deliberately no warehouse select: POS always resolves
 * the warehouse from the shift's own register, server-side
 * (`RingUpSaleUseCase`), never from user input.
 */
interface ProductLineFieldsProps {
  fieldPrefix: string;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  taxes: TaxResponse[];
  productId: string;
  onProductIdChange: (id: string) => void;
  productVariantId: string;
  onProductVariantIdChange: (id: string) => void;
  taxId: string;
  onTaxIdChange: (id: string) => void;
}

export function ProductLineFields({
  fieldPrefix,
  selection,
  companyId,
  products,
  taxes,
  productId,
  onProductIdChange,
  productVariantId,
  onProductVariantIdChange,
  taxId,
  onTaxIdChange,
}: ProductLineFieldsProps) {
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
    <div className="grid gap-4 sm:grid-cols-3">
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
      <Select name={`${fieldPrefix}-taxId`} label="Impuesto (opcional)" value={taxId} onChange={(event) => onTaxIdChange(event.target.value)}>
        <option value="">Sin impuesto</option>
        {taxes.map((tax) => (
          <option key={tax.id} value={tax.id}>
            {tax.name} ({tax.rate}%)
          </option>
        ))}
      </Select>
    </div>
  );
}
