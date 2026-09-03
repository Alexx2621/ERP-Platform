import { Check, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ActivityResponse, ActivityType, LeadResponse, OpportunityResponse } from "@erp/api-client";
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
import { activityTypeLabel, isAbortError, statusToneClass, type WorkspaceSelection } from "./crm-shared";

const ACTIVITY_TYPES: ActivityType[] = ["CALL", "EMAIL", "MEETING", "NOTE", "TASK"];

type RelationKind = "lead" | "opportunity" | "customer";

interface ActivitiesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  leads: LeadResponse[] | null;
  opportunities: OpportunityResponse[] | null;
  active: boolean;
}

function relatedLabel(activity: ActivityResponse, leads: LeadResponse[] | null, opportunities: OpportunityResponse[] | null): string {
  if (activity.relatedLeadId) {
    return `Prospecto: ${leads?.find((lead) => lead.id === activity.relatedLeadId)?.name ?? activity.relatedLeadId}`;
  }
  if (activity.relatedOpportunityId) {
    return `Oportunidad: ${opportunities?.find((o) => o.id === activity.relatedOpportunityId)?.name ?? activity.relatedOpportunityId}`;
  }
  return `Cliente: ${activity.relatedCustomerId ?? "—"}`;
}

export function ActivitiesPanel({ selection, companyId, leads, opportunities, active }: ActivitiesPanelProps) {
  const { getAccessToken } = useAuth();
  const [activities, setActivities] = useState<ActivityResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const [type, setType] = useState<ActivityType>("NOTE");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [relationKind, setRelationKind] = useState<RelationKind>("lead");
  const [relatedLeadId, setRelatedLeadId] = useState("");
  const [relatedOpportunityId, setRelatedOpportunityId] = useState("");
  const [relatedCustomerId, setRelatedCustomerId] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setActivities(await apiClient.listActivities(accessToken, selection.slug, companyId, {}, signal));
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

  const openCreate = () => {
    setType("NOTE");
    setSubject("");
    setNotes("");
    setDueAt("");
    setRelationKind("lead");
    setRelatedLeadId("");
    setRelatedOpportunityId("");
    setRelatedCustomerId("");
    setFormError(undefined);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createActivity(accessToken, selection.slug, companyId, {
        type,
        subject,
        notes: notes || undefined,
        dueAt: dueAt || undefined,
        relatedLeadId: relationKind === "lead" ? relatedLeadId : undefined,
        relatedOpportunityId: relationKind === "opportunity" ? relatedOpportunityId : undefined,
        relatedCustomerId: relationKind === "customer" ? relatedCustomerId : undefined,
      });
      setActivities((current) => [created, ...(current ?? [])]);
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (activity: ActivityResponse) => {
    setActionError(undefined);
    setBusyId(activity.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.completeActivity(accessToken, selection.slug, companyId, activity.id);
      setActivities((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  const relationValid =
    (relationKind === "lead" && relatedLeadId) ||
    (relationKind === "opportunity" && relatedOpportunityId) ||
    (relationKind === "customer" && relatedCustomerId.trim());

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Registro de actividades ligadas a prospectos, oportunidades o clientes.</p>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva actividad
        </Button>
      </div>
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={activities === null}>
          <TableCaption>Actividades</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Asunto</TableHead>
              <TableHead scope="col">Relación</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities === null ? (
              <LoadingRows columns={5} />
            ) : activities.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay actividades" />
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="text-[12px]">{activityTypeLabel(activity.type)}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{activity.subject}</TableCell>
                  <TableCell className="text-[12px]">{relatedLabel(activity, leads, opportunities)}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(Boolean(activity.completedAt))}`}>
                      {activity.completedAt ? "Completada" : "Pendiente"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!activity.completedAt ? (
                      <Button type="button" variant="secondary" className="h-9 px-3" busy={busyId === activity.id} onClick={() => void complete(activity)}>
                        <Check size={16} weight="bold" aria-hidden="true" />
                        Completar
                      </Button>
                    ) : null}
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
        title="Nueva actividad"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="activity-form" busy={busy} disabled={!relationValid}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="activity-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <Select name="activity-type" label="Tipo" value={type} required onChange={(event) => setType(event.target.value as ActivityType)}>
            {ACTIVITY_TYPES.map((activityType) => (
              <option key={activityType} value={activityType}>
                {activityTypeLabel(activityType)}
              </option>
            ))}
          </Select>
          <FormField name="activity-subject" label="Asunto" value={subject} required onChange={(event) => setSubject(event.target.value)} />
          <FormField name="activity-notes" label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <FormField
            name="activity-due"
            label="Vencimiento (opcional)"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />

          <div className="grid gap-4 border-t border-[var(--line)] pt-5">
            <p className="text-[12px] font-extrabold text-[var(--ink)]">Relación (exactamente una)</p>
            <Select name="activity-relation-kind" label="Relacionar con" value={relationKind} onChange={(event) => setRelationKind(event.target.value as RelationKind)}>
              <option value="lead">Prospecto</option>
              <option value="opportunity">Oportunidad</option>
              <option value="customer">Cliente</option>
            </Select>
            {relationKind === "lead" ? (
              <Select name="activity-related-lead" label="Prospecto" value={relatedLeadId} required onChange={(event) => setRelatedLeadId(event.target.value)}>
                <option value="">Selecciona un prospecto</option>
                {(leads ?? []).map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </Select>
            ) : relationKind === "opportunity" ? (
              <Select
                name="activity-related-opportunity"
                label="Oportunidad"
                value={relatedOpportunityId}
                required
                onChange={(event) => setRelatedOpportunityId(event.target.value)}
              >
                <option value="">Selecciona una oportunidad</option>
                {(opportunities ?? []).map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.name}
                  </option>
                ))}
              </Select>
            ) : (
              <FormField
                name="activity-related-customer"
                label="ID de cliente"
                hint="ID del cliente ya existente en Contactos"
                value={relatedCustomerId}
                required
                onChange={(event) => setRelatedCustomerId(event.target.value)}
              />
            )}
          </div>
        </form>
      </Modal>
    </section>
  );
}
