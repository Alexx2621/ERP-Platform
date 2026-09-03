import { ListDashes, Plus, ToggleLeft, ToggleRight, Trash } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import type { BillOfMaterialComponentResponse, BillOfMaterialResponse, ProductResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { billOfMaterialStatusLabel, ProductSelectFields, productLabel, statusToneClass, type WorkspaceSelection } from "./manufacturing-shared";

interface DraftComponent {
  key: string;
  componentProductId: string;
  componentVariantId?: string;
  quantityPerUnit: string;
}

interface ComponentsModalProps {
  billOfMaterial: BillOfMaterialResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  onOpenChange: (open: boolean) => void;
}

function ComponentsModal({ billOfMaterial, selection, companyId, products, onOpenChange }: ComponentsModalProps) {
  const { getAccessToken } = useAuth();
  const [components, setComponents] = useState<BillOfMaterialComponentResponse[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!billOfMaterial) {
      setComponents(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.listBillOfMaterialComponents(accessToken, selection.slug, companyId, billOfMaterial.id);
        if (!cancelled) setComponents(result);
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, getAccessToken, billOfMaterial, selection.slug]);

  return (
    <Modal open={Boolean(billOfMaterial)} onOpenChange={onOpenChange} title={billOfMaterial ? `Componentes · ${billOfMaterial.name}` : "Componentes"}>
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table aria-busy={components === null}>
          <TableCaption>Componentes de la lista de materiales</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Componente</TableHead>
              <TableHead scope="col">Cantidad por unidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components === null ? (
              <LoadingRows columns={2} />
            ) : components.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={2} title="Sin componentes" />
              </TableRow>
            ) : (
              components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="text-[12px] font-semibold">{productLabel(products, component.componentProductId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{component.quantityPerUnit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Modal>
  );
}

interface BillsOfMaterialPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  billsOfMaterial: BillOfMaterialResponse[] | null;
  products: ProductResponse[];
  error?: string;
  onRetry: () => void;
  onBillsOfMaterialChanged: (updater: (current: BillOfMaterialResponse[] | null) => BillOfMaterialResponse[] | null) => void;
}

/**
 * `billsOfMaterial` is loaded once at the page level (`ManufacturingPage`)
 * — the Órdenes de producción tab needs the same list for its BOM select
 * regardless of which tab is active by default (the same lesson POS's own
 * register list already found and fixed, session 30).
 */
export function BillsOfMaterialPanel({
  selection,
  companyId,
  billsOfMaterial,
  products,
  error,
  onRetry,
  onBillsOfMaterialChanged,
}: BillsOfMaterialPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [componentsFor, setComponentsFor] = useState<BillOfMaterialResponse | null>(null);

  const [productId, setProductId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [componentProductId, setComponentProductId] = useState("");
  const [componentVariantId, setComponentVariantId] = useState("");
  const [componentQuantity, setComponentQuantity] = useState("");
  const [draftComponents, setDraftComponents] = useState<DraftComponent[]>([]);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setProductId("");
    setCode("");
    setName("");
    setComponentProductId("");
    setComponentVariantId("");
    setComponentQuantity("");
    setDraftComponents([]);
    setFormError(undefined);
    setModalOpen(true);
  };

  const addDraftComponent = () => {
    if (!componentProductId || !componentQuantity) return;
    setDraftComponents((current) => [
      ...current,
      {
        key: `${componentProductId}-${componentVariantId}-${current.length}`,
        componentProductId,
        componentVariantId: componentVariantId || undefined,
        quantityPerUnit: componentQuantity,
      },
    ]);
    setComponentProductId("");
    setComponentVariantId("");
    setComponentQuantity("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftComponents.length === 0) {
      setFormError("Agrega al menos un componente antes de crear la lista de materiales.");
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createBillOfMaterial(accessToken, selection.slug, companyId, {
        productId,
        code,
        name,
        components: draftComponents.map(({ componentProductId: cp, componentVariantId: cv, quantityPerUnit }) => ({
          componentProductId: cp,
          componentVariantId: cv,
          quantityPerUnit,
        })),
      });
      onBillsOfMaterialChanged((current) => [...(current ?? []), created]);
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (billOfMaterial: BillOfMaterialResponse) => {
    setActionError(undefined);
    setBusyId(billOfMaterial.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setBillOfMaterialStatus(accessToken, selection.slug, companyId, billOfMaterial.id, {
        status: billOfMaterial.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      onBillsOfMaterialChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Listas de materiales (recetas) de la empresa activa.</p>
        <Button type="button" onClick={openCreate} disabled={products.length === 0}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva lista de materiales
        </Button>
      </div>
      {products.length === 0 ? <ErrorNotice message="Todavía no hay productos en esta empresa. Crea al menos dos en Catálogo (un producto terminado y un componente)." /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={billsOfMaterial === null}>
          <TableCaption>Listas de materiales</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Producto terminado</TableHead>
              <TableHead scope="col">Versión</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billsOfMaterial === null ? (
              <LoadingRows columns={6} />
            ) : billsOfMaterial.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay listas de materiales" />
              </TableRow>
            ) : (
              billsOfMaterial.map((billOfMaterial) => (
                <TableRow key={billOfMaterial.id}>
                  <TableCell className="font-mono text-[11px]">{billOfMaterial.code}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{billOfMaterial.name}</TableCell>
                  <TableCell className="text-[12px]">{productLabel(products, billOfMaterial.productId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{billOfMaterial.version}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(billOfMaterial.status === "ACTIVE")}`}>
                      {billOfMaterialStatusLabel(billOfMaterial.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setComponentsFor(billOfMaterial)}>
                        <ListDashes size={16} weight="bold" aria-hidden="true" />
                        Componentes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3"
                        busy={busyId === billOfMaterial.id}
                        onClick={() => void toggleStatus(billOfMaterial)}
                      >
                        {billOfMaterial.status === "ACTIVE" ? (
                          <ToggleRight size={16} weight="fill" aria-hidden="true" />
                        ) : (
                          <ToggleLeft size={16} weight="bold" aria-hidden="true" />
                        )}
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
        title="Nueva lista de materiales"
        size="lg"
        description="Crea una nueva versión inmutable de la receta. Para revisarla más adelante, crea una lista de materiales nueva."
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="bom-form" busy={busy} disabled={draftComponents.length === 0}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="bom-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="bom-code" label="Código" value={code} required maxLength={50} onChange={(event) => setCode(event.target.value)} />
            <FormField name="bom-name" label="Nombre" value={name} required maxLength={150} onChange={(event) => setName(event.target.value)} />
          </div>
          <ProductSelectFields
            fieldPrefix="bom-finished-good"
            selection={selection}
            companyId={companyId}
            products={products}
            productId={productId}
            onProductIdChange={setProductId}
            productVariantId=""
            onProductVariantIdChange={() => {}}
            label="Producto terminado"
          />

          <div className="grid gap-4 border-t border-[var(--line)] pt-5">
            <p className="text-[12px] font-extrabold text-[var(--ink)]">Componentes</p>
            <ProductSelectFields
              fieldPrefix="bom-component"
              selection={selection}
              companyId={companyId}
              products={products}
              productId={componentProductId}
              onProductIdChange={setComponentProductId}
              productVariantId={componentVariantId}
              onProductVariantIdChange={setComponentVariantId}
              label="Componente"
              required={false}
            />
            <FormField
              name="bom-component-quantity"
              label="Cantidad por unidad"
              placeholder="2.0000"
              value={componentQuantity}
              onChange={(event) => setComponentQuantity(event.target.value)}
            />
            <Button type="button" variant="secondary" className="w-fit" onClick={addDraftComponent} disabled={!componentProductId || !componentQuantity}>
              <Plus size={16} weight="bold" aria-hidden="true" />
              Agregar componente
            </Button>

            {draftComponents.length > 0 ? (
              <ul className="grid gap-2">
                {draftComponents.map((component, index) => (
                  <li
                    key={component.key}
                    className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--ink)]"
                  >
                    <span>
                      {productLabel(products, component.componentProductId)} · {component.quantityPerUnit}
                    </span>
                    <button
                      type="button"
                      className="text-[var(--muted-strong)] hover:text-[var(--danger)]"
                      onClick={() => setDraftComponents((current) => current.filter((_, i) => i !== index))}
                      aria-label="Quitar componente"
                    >
                      <Trash size={16} weight="bold" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </form>
      </Modal>

      <ComponentsModal
        billOfMaterial={componentsFor}
        selection={selection}
        companyId={companyId}
        products={products}
        onOpenChange={(open) => !open && setComponentsFor(null)}
      />
    </section>
  );
}
