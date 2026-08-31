import { ListDashes, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  ProductVariantResponse,
  TenantSummary,
  UnitOfMeasureResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface ProductsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  /** Units/categories/brands created in their own tabs land here, but Tabs
   * only toggles `hidden` (every panel stays mounted) — without gating on
   * `active`, this panel's dropdowns keep whatever was current the moment
   * the page first mounted, which is empty if the user hasn't visited the
   * Products tab yet. Re-fetching on every activation, not just the first
   * mount, mirrors the fix already applied to platform-admin's AuditPanel. */
  active: boolean;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseAttributes(raw: string): { value?: Record<string, string>; error?: string } {
  if (!raw.trim()) return { error: "Ingresa al menos un atributo, por ejemplo {\"color\":\"Azul\"}." };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "Debe ser un objeto JSON, por ejemplo {\"color\":\"Azul\",\"talla\":\"M\"}." };
    }
    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.some(([, value]) => typeof value !== "string")) {
      return { error: "Cada valor de atributo debe ser texto." };
    }
    return { value: parsed as Record<string, string> };
  } catch {
    return { error: "JSON inválido." };
  }
}

interface VariantsModalProps {
  product: ProductResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
}

function VariantsModal({ product, selection, companyId, onOpenChange }: VariantsModalProps) {
  const { getAccessToken } = useAuth();
  const [variants, setVariants] = useState<ProductVariantResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [sku, setSku] = useState("");
  const [attributesRaw, setAttributesRaw] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!product) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setVariants(
          await apiClient.listProductVariants(accessToken, selection.slug, companyId, product.id, signal),
        );
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, product, selection.slug],
  );

  useEffect(() => {
    if (!product) {
      setVariants(null);
      return;
    }
    setSku("");
    setAttributesRaw("");
    setPrice("");
    setFormError(undefined);
    void load();
  }, [load, product]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    const attributes = parseAttributes(attributesRaw);
    if (attributes.error || !attributes.value) {
      setFormError(attributes.error);
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addProductVariant(accessToken, selection.slug, companyId, product.id, {
        sku,
        attributes: attributes.value,
        price,
      });
      setVariants((current) => [...(current ?? []), created]);
      setSku("");
      setAttributesRaw("");
      setPrice("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(product)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={product ? `Variantes de ${product.name}` : "Variantes"}
      description="Cada variante es un SKU vendible con su propio precio y atributos (color, talla, etc.)."
    >
      <div className="grid gap-6">
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={variants === null}>
            <TableCaption>Variantes del producto</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">SKU</TableHead>
                <TableHead scope="col">Atributos</TableHead>
                <TableHead scope="col">Precio</TableHead>
                <TableHead scope="col">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants === null ? (
                <LoadingRows columns={4} />
              ) : variants.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={4} title="Todavía no hay variantes" />
                </TableRow>
              ) : (
                variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <code className="text-[11px] font-bold">{variant.sku}</code>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[10px] text-[var(--muted-strong)]">
                        {Object.entries(variant.attributes)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{variant.price}</TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${variant.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                      >
                        {variant.status === "ACTIVE" ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <form
          className="grid gap-4 border-t border-[var(--line)] pt-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Agregar variante</p>
          {formError ? <ErrorNotice message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="sku" label="SKU" value={sku} required onChange={(event) => setSku(event.target.value)} />
            <FormField
              name="price"
              label="Precio"
              value={price}
              required
              placeholder="19.9900"
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
          <FormField
            name="attributes"
            label='Atributos (JSON, ej. {"color":"Azul","talla":"M"})'
            value={attributesRaw}
            required
            placeholder='{"color":"Azul","talla":"M"}'
            onChange={(event) => setAttributesRaw(event.target.value)}
          />
          <Button type="submit" busy={busy} className="w-fit">
            <Plus size={16} weight="bold" aria-hidden="true" />
            Agregar variante
          </Button>
        </form>
      </div>
    </Modal>
  );
}

export function ProductsPanel({ selection, companyId, active }: ProductsPanelProps) {
  const { getAccessToken } = useAuth();
  const [products, setProducts] = useState<ProductResponse[] | null>(null);
  const [units, setUnits] = useState<UnitOfMeasureResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [variantsProduct, setVariantsProduct] = useState<ProductResponse | null>(null);
  const [pendingId, setPendingId] = useState<string>();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unitOfMeasureId, setUnitOfMeasureId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [productsResult, unitsResult, categoriesResult, brandsResult] = await Promise.all([
          apiClient.listProducts(accessToken, selection.slug, companyId, signal),
          apiClient.listUnitsOfMeasure(accessToken, selection.slug, companyId, signal),
          apiClient.listCategories(accessToken, selection.slug, companyId, signal),
          apiClient.listBrands(accessToken, selection.slug, companyId, signal),
        ]);
        setProducts(productsResult);
        setUnits(unitsResult);
        setCategories(categoriesResult);
        setBrands(brandsResult);
        setUnitOfMeasureId((current) => current || (unitsResult[0]?.id ?? current));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active, load]);

  const toggleStatus = async (product: ProductResponse) => {
    setPendingId(product.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setProductStatus(accessToken, selection.slug, companyId, product.id, {
        status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setProducts((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createProduct(accessToken, selection.slug, companyId, {
        code,
        name,
        unitOfMeasureId,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        basePrice: hasVariants ? undefined : basePrice || undefined,
        hasVariants,
      });
      setProducts((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setCategoryId("");
      setBrandId("");
      setBasePrice("");
      setHasVariants(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Productos de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)} disabled={units.length === 0}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo producto
        </Button>
      </div>
      {units.length === 0 && products !== null ? (
        <ErrorNotice message="Crea al menos una unidad de medida antes de registrar productos." />
      ) : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={products === null}>
          <TableCaption>Productos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Precio base</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products === null ? (
              <LoadingRows columns={5} />
            ) : products.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay productos" />
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{product.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{product.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {product.hasVariants ? "Por variante" : (product.basePrice ?? "—")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${product.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {product.hasVariants ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={() => setVariantsProduct(product)}
                        >
                          <ListDashes size={16} weight="bold" aria-hidden="true" />
                          Variantes
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === product.id}
                        onClick={() => void toggleStatus(product)}
                      >
                        {product.status === "ACTIVE" ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => !busy && setModalOpen(open)}
        title="Nuevo producto"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="create-product-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="create-product-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="code" label="Código" value={code} required autoFocus onChange={(event) => setCode(event.target.value)} />
            <FormField name="name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
          </div>
          <Select
            name="unitOfMeasureId"
            label="Unidad de medida"
            value={unitOfMeasureId}
            required
            onChange={(event) => setUnitOfMeasureId(event.target.value)}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="categoryId" label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select name="brandId" label="Marca" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
              <option value="">Sin marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] font-bold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(event) => setHasVariants(event.target.checked)}
              className="size-4"
            />
            Este producto tiene variantes (color, talla, etc.)
          </label>
          {!hasVariants ? (
            <FormField
              name="basePrice"
              label="Precio base"
              value={basePrice}
              required
              placeholder="19.9900"
              hint="Requerido si el producto no tiene variantes."
              onChange={(event) => setBasePrice(event.target.value)}
            />
          ) : null}
        </form>
      </Modal>

      <VariantsModal
        product={variantsProduct}
        selection={selection}
        companyId={companyId}
        onOpenChange={(open) => !open && setVariantsProduct(null)}
      />
    </section>
  );
}
