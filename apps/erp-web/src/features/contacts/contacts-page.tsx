import { ArrowLeft, PencilSimple, Plus, Truck, Users } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CustomerResponse, SupplierResponse, TenantSummary } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/auth-context";
import { getErrorMessage } from "../../shared/api/error-message";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
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
import { Tabs } from "../../shared/ui/tabs";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface ContactsPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface ContactItem {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  status: "ACTIVE" | "INACTIVE";
}

interface ContactFormValues {
  code: string;
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
}

const emptyForm: ContactFormValues = {
  code: "",
  name: "",
  legalName: "",
  taxId: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  country: "",
};

function toFormValues(item: ContactItem): ContactFormValues {
  return {
    code: item.code,
    name: item.name,
    legalName: item.legalName ?? "",
    taxId: item.taxId ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    addressLine: item.addressLine ?? "",
    city: item.city ?? "",
    country: item.country ?? "",
  };
}

interface ContactPanelProps<T extends ContactItem> {
  /** Unique per instance — Tabs keeps every panel mounted at once, so field ids/names must not collide across the Clientes/Proveedores modals sharing this component. */
  fieldPrefix: string;
  entityLabel: string;
  /** Singular, lowercase form (e.g. "cliente", "proveedor") — passed explicitly rather than derived from `entityLabel` with a regex, since naive singularization ("proveedores" → "proveedore") is wrong in Spanish. */
  singularLabel: string;
  emptyTitle: string;
  load: (signal?: AbortSignal) => Promise<T[]>;
  create: (values: ContactFormValues) => Promise<T>;
  update: (id: string, values: ContactFormValues) => Promise<T>;
  setStatus: (id: string, status: "ACTIVE" | "INACTIVE") => Promise<T>;
}

/**
 * Reusable list+create+edit+toggle panel shared by Customers/Suppliers.
 * Unlike the backend (deliberately two separate entities — see the
 * schema.prisma docstring on `Customer` for why), the UI is presentation-only
 * and carries no business-rule divergence risk, so one generic component here
 * avoids duplicating an 8-field form twice.
 */
function ContactPanel<T extends ContactItem>({
  fieldPrefix,
  entityLabel,
  singularLabel,
  emptyTitle,
  load,
  create,
  update,
  setStatus,
}: ContactPanelProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<ContactFormValues>(emptyForm);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        setItems(await load(signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [load],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setForm(toFormValues(item));
    setFormError(undefined);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      if (editing) {
        const updated = await update(editing.id, form);
        setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
      } else {
        const created = await create(form);
        setItems((current) => [...(current ?? []), created]);
      }
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: T) => {
    setPendingId(item.id);
    try {
      const updated = await setStatus(item.id, item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">
          {entityLabel} de la empresa activa.
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo {singularLabel}
        </Button>
      </div>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={items === null}>
          <TableCaption>{entityLabel}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Identificación fiscal</TableHead>
              <TableHead scope="col">Correo</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items === null ? (
              <LoadingRows columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title={emptyTitle} />
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{item.code}</code>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">{item.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{item.taxId ?? "—"}</TableCell>
                  <TableCell className="text-[12px]">{item.email ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${item.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      {item.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openEdit(item)}>
                        <PencilSimple size={16} weight="bold" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant={item.status === "ACTIVE" ? "quiet" : "secondary"}
                        className="h-9 px-3"
                        busy={pendingId === item.id}
                        onClick={() => void toggle(item)}
                      >
                        {item.status === "ACTIVE" ? "Desactivar" : "Activar"}
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
        title={editing ? `Editar ${singularLabel}` : `Nuevo ${singularLabel}`}
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={`${fieldPrefix}-form`} busy={busy}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </>
        }
      >
        <form
          id={`${fieldPrefix}-form`}
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name={`${fieldPrefix}-code`}
              label="Código"
              value={form.code}
              autoFocus={!editing}
              required
              disabled={Boolean(editing)}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            />
            <FormField
              name={`${fieldPrefix}-name`}
              label="Nombre"
              value={form.name}
              required
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <FormField
            name={`${fieldPrefix}-legalName`}
            label="Razón social"
            value={form.legalName}
            onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name={`${fieldPrefix}-taxId`}
              label="Identificación fiscal"
              value={form.taxId}
              onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
            />
            <FormField
              name={`${fieldPrefix}-email`}
              label="Correo"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name={`${fieldPrefix}-phone`}
              label="Teléfono"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <FormField
              name={`${fieldPrefix}-country`}
              label="País (ISO, ej. GT)"
              maxLength={2}
              value={form.country}
              onChange={(event) => setForm((current) => ({ ...current, country: event.target.value.toUpperCase() }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name={`${fieldPrefix}-addressLine`}
              label="Dirección"
              value={form.addressLine}
              onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))}
            />
            <FormField
              name={`${fieldPrefix}-city`}
              label="Ciudad"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </section>
  );
}

export function ContactsPage({ selection, navigate }: ContactsPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Contactos"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar los contactos." />
        </div>
      </ProductShell>
    );
  }

  return <ContactsWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface ContactsWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function ContactsWorkspace({ selection, companyId, navigate }: ContactsWorkspaceProps) {
  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Contactos"
      description="Administra los clientes y proveedores de la empresa activa."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <div className="pt-7">
        <Tabs
          ariaLabel="Administración de contactos"
          items={[
            {
              id: "customers",
              label: (
                <span className="flex items-center gap-2">
                  <Users size={16} aria-hidden="true" />
                  Clientes
                </span>
              ),
              panel: (
                <ContactsCustomersPanel selection={selection} companyId={companyId} />
              ),
            },
            {
              id: "suppliers",
              label: (
                <span className="flex items-center gap-2">
                  <Truck size={16} aria-hidden="true" />
                  Proveedores
                </span>
              ),
              panel: (
                <ContactsSuppliersPanel selection={selection} companyId={companyId} />
              ),
            },
          ]}
        />
      </div>
    </ProductShell>
  );
}

// Split into their own components (not inline closures in the Tabs items
// array) so their `apiClient`/`getAccessToken` calls are declared once per
// mount, not recreated as new closures on every ContactsWorkspace render —
// the same lesson learned from catalog-page.tsx's reload-loop bug.
function ContactsCustomersPanel({ selection, companyId }: { selection: WorkspaceSelection; companyId: string }) {
  const { getAccessToken } = useAuth();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listCustomers(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );
  const create = useCallback(
    async (values: ContactFormValues): Promise<CustomerResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.createCustomer(accessToken, selection.slug, companyId, {
        code: values.code,
        name: values.name,
        legalName: values.legalName || undefined,
        taxId: values.taxId || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        addressLine: values.addressLine || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
      });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const update = useCallback(
    async (id: string, values: ContactFormValues): Promise<CustomerResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.updateCustomer(accessToken, selection.slug, companyId, id, {
        name: values.name,
        legalName: values.legalName,
        taxId: values.taxId,
        email: values.email,
        phone: values.phone,
        addressLine: values.addressLine,
        city: values.city,
        country: values.country,
      });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const setStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE"): Promise<CustomerResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.setCustomerStatus(accessToken, selection.slug, companyId, id, { status });
    },
    [companyId, getAccessToken, selection.slug],
  );

  return (
    <ContactPanel<CustomerResponse>
      fieldPrefix="customer"
      entityLabel="Clientes"
      singularLabel="cliente"
      emptyTitle="Todavía no hay clientes"
      load={load}
      create={create}
      update={update}
      setStatus={setStatus}
    />
  );
}

function ContactsSuppliersPanel({ selection, companyId }: { selection: WorkspaceSelection; companyId: string }) {
  const { getAccessToken } = useAuth();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const accessToken = await getAccessToken();
      return apiClient.listSuppliers(accessToken, selection.slug, companyId, signal);
    },
    [companyId, getAccessToken, selection.slug],
  );
  const create = useCallback(
    async (values: ContactFormValues): Promise<SupplierResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.createSupplier(accessToken, selection.slug, companyId, {
        code: values.code,
        name: values.name,
        legalName: values.legalName || undefined,
        taxId: values.taxId || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        addressLine: values.addressLine || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
      });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const update = useCallback(
    async (id: string, values: ContactFormValues): Promise<SupplierResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.updateSupplier(accessToken, selection.slug, companyId, id, {
        name: values.name,
        legalName: values.legalName,
        taxId: values.taxId,
        email: values.email,
        phone: values.phone,
        addressLine: values.addressLine,
        city: values.city,
        country: values.country,
      });
    },
    [companyId, getAccessToken, selection.slug],
  );
  const setStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE"): Promise<SupplierResponse> => {
      const accessToken = await getAccessToken();
      return apiClient.setSupplierStatus(accessToken, selection.slug, companyId, id, { status });
    },
    [companyId, getAccessToken, selection.slug],
  );

  return (
    <ContactPanel<SupplierResponse>
      fieldPrefix="supplier"
      entityLabel="Proveedores"
      singularLabel="proveedor"
      emptyTitle="Todavía no hay proveedores"
      load={load}
      create={create}
      update={update}
      setStatus={setStatus}
    />
  );
}
