import { ArrowRight, PencilSimple, Plus } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { LeadResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { leadStatusLabel, statusToneClass, type WorkspaceSelection } from "./crm-shared";

const SETTABLE_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "LOST"] as const;

interface LeadFormValues {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
}

const emptyForm: LeadFormValues = { name: "", companyName: "", email: "", phone: "", source: "" };

function toFormValues(lead: LeadResponse): LeadFormValues {
  return {
    name: lead.name,
    companyName: lead.companyName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "",
  };
}

interface LeadsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  leads: LeadResponse[] | null;
  error?: string;
  onRetry: () => void;
  onLeadsChanged: (updater: (current: LeadResponse[] | null) => LeadResponse[] | null) => void;
}

/**
 * `leads` is loaded once at the page level (`CrmPage`), not lazily on this
 * tab's own activation — the Actividades tab's relation selects need the
 * same list regardless of which tab is active by default (the exact bug
 * POS's own register list already found and fixed, session 30).
 */
export function LeadsPanel({ selection, companyId, leads, error, onRetry, onLeadsChanged }: LeadsPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadResponse | null>(null);
  const [form, setForm] = useState<LeadFormValues>(emptyForm);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [convertedNotice, setConvertedNotice] = useState<string>();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  };

  const openEdit = (lead: LeadResponse) => {
    setEditing(lead);
    setForm(toFormValues(lead));
    setFormError(undefined);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      if (editing) {
        const updated = await apiClient.updateLead(accessToken, selection.slug, companyId, editing.id, {
          name: form.name,
          companyName: form.companyName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          source: form.source || undefined,
        });
        onLeadsChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
      } else {
        const created = await apiClient.createLead(accessToken, selection.slug, companyId, {
          name: form.name,
          companyName: form.companyName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          source: form.source || undefined,
        });
        onLeadsChanged((current) => [...(current ?? []), created]);
      }
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (lead: LeadResponse, status: (typeof SETTABLE_STATUSES)[number]) => {
    setActionError(undefined);
    setPendingId(lead.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setLeadStatus(accessToken, selection.slug, companyId, lead.id, { status });
      onLeadsChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  const toggleConsent = async (lead: LeadResponse) => {
    setActionError(undefined);
    setPendingId(lead.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setLeadConsent(accessToken, selection.slug, companyId, lead.id, {
        consentMarketing: !lead.consentMarketing,
      });
      onLeadsChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  const convert = async (lead: LeadResponse) => {
    setActionError(undefined);
    setConvertedNotice(undefined);
    setPendingId(lead.id);
    try {
      const accessToken = await getAccessToken();
      const result = await apiClient.convertLead(accessToken, selection.slug, companyId, lead.id);
      onLeadsChanged((current) => (current ?? []).map((existing) => (existing.id === result.lead.id ? result.lead : existing)));
      setConvertedNotice(
        result.wasExistingCustomer
          ? `Convertido a un cliente ya existente (ID ${result.customerId}).`
          : `Cliente nuevo creado (ID ${result.customerId}).`,
      );
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Prospectos comerciales de la empresa activa.</p>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo prospecto
        </Button>
      </div>
      {convertedNotice ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--accent-soft)] px-3.5 py-3 text-[13px] font-semibold leading-5 text-[var(--accent-soft-text)]"
        >
          <span>{convertedNotice}</span>
        </div>
      ) : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={leads === null}>
          <TableCaption>Prospectos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Empresa</TableHead>
              <TableHead scope="col">Correo</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col">Consentimiento</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads === null ? (
              <LoadingRows columns={6} />
            ) : leads.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay prospectos" />
              </TableRow>
            ) : (
              leads.map((lead) => {
                const terminal = lead.status === "CONVERTED" || lead.status === "LOST";
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="text-[12px] font-semibold">{lead.name}</TableCell>
                    <TableCell className="text-[12px]">{lead.companyName ?? "—"}</TableCell>
                    <TableCell className="text-[12px]">{lead.email ?? "—"}</TableCell>
                    <TableCell>
                      {terminal ? (
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(lead.status === "CONVERTED")}`}>
                          {leadStatusLabel(lead.status)}
                        </span>
                      ) : (
                        <Select
                          name={`lead-status-${lead.id}`}
                          label=""
                          aria-label={`Estado de ${lead.name}`}
                          className="h-9 text-[12px]"
                          value={lead.status}
                          disabled={pendingId === lead.id}
                          onChange={(event) => void changeStatus(lead, event.target.value as (typeof SETTABLE_STATUSES)[number])}
                        >
                          {SETTABLE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {leadStatusLabel(status)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(lead.consentMarketing)}`}
                        disabled={pendingId === lead.id}
                        onClick={() => void toggleConsent(lead)}
                      >
                        {lead.consentMarketing ? "Sí" : "No"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openEdit(lead)}>
                          <PencilSimple size={16} weight="bold" aria-hidden="true" />
                          Editar
                        </Button>
                        {!terminal ? (
                          <Button type="button" variant="secondary" className="h-9 px-3" busy={pendingId === lead.id} onClick={() => void convert(lead)}>
                            <ArrowRight size={16} weight="bold" aria-hidden="true" />
                            Convertir
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => !busy && setModalOpen(open)}
        title={editing ? "Editar prospecto" : "Nuevo prospecto"}
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="lead-form" busy={busy}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </>
        }
      >
        <form
          id="lead-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="lead-name" label="Nombre" value={form.name} autoFocus required onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <FormField
            name="lead-companyName"
            label="Empresa"
            value={form.companyName}
            onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="lead-email"
              label="Correo"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <FormField
              name="lead-phone"
              label="Teléfono"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
          <FormField
            name="lead-source"
            label="Fuente"
            hint="Ej. Sitio web, referido, feria comercial"
            value={form.source}
            onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
          />
        </form>
      </Modal>
    </section>
  );
}
