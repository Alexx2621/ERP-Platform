import { ArrowRight, PencilSimple, Plus } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import type { LeadResponse, OpportunityResponse, PipelineResponse, PipelineStageResponse } from "@erp/api-client";
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
import { opportunityStatusLabel, statusToneClass, type WorkspaceSelection } from "./crm-shared";

function pipelineName(pipelines: PipelineResponse[], pipelineId: string): string {
  return pipelines.find((p) => p.id === pipelineId)?.name ?? pipelineId;
}

interface MoveStageModalProps {
  opportunity: OpportunityResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
  onMoved: (updated: OpportunityResponse) => void;
}

function MoveStageModal({ opportunity, selection, companyId, onOpenChange, onMoved }: MoveStageModalProps) {
  const { getAccessToken } = useAuth();
  const [stages, setStages] = useState<PipelineStageResponse[] | null>(null);
  const [stageId, setStageId] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opportunity) {
      setStages(null);
      setStageId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.listPipelineStages(accessToken, selection.slug, companyId, opportunity.pipelineId);
        if (!cancelled) setStages(result);
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, getAccessToken, opportunity, selection.slug]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!opportunity || !stageId) return;
    setError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.moveOpportunityStage(accessToken, selection.slug, companyId, opportunity.id, { stageId });
      onMoved(updated);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(opportunity)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={opportunity ? `Mover etapa · ${opportunity.name}` : "Mover etapa"}
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="move-stage-form" busy={busy} disabled={!stageId}>
            Mover
          </Button>
        </>
      }
    >
      <form
        id="move-stage-form"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}
        <Select name="move-stage-target" label="Nueva etapa" value={stageId} required onChange={(event) => setStageId(event.target.value)}>
          <option value="">Selecciona una etapa</option>
          {(stages ?? []).map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
              {stage.isWon ? " (gana)" : stage.isLost ? " (pierde)" : ""}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

interface OpportunitiesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  pipelines: PipelineResponse[] | null;
  leads: LeadResponse[] | null;
  opportunities: OpportunityResponse[] | null;
  error?: string;
  onRetry: () => void;
  onOpportunitiesChanged: (updater: (current: OpportunityResponse[] | null) => OpportunityResponse[] | null) => void;
}

/**
 * `opportunities` is loaded once at the page level (`CrmPage`), not lazily
 * on this tab's own activation — the Actividades tab's relation select
 * needs the same list regardless of which tab is active by default.
 */
export function OpportunitiesPanel({
  selection,
  companyId,
  pipelines,
  leads,
  opportunities,
  error,
  onRetry,
  onOpportunitiesChanged,
}: OpportunitiesPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OpportunityResponse | null>(null);
  const [movingStage, setMovingStage] = useState<OpportunityResponse | null>(null);

  const [name, setName] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [createStages, setCreateStages] = useState<PipelineStageResponse[] | null>(null);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pipelineId) {
      setCreateStages(null);
      setStageId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.listPipelineStages(accessToken, selection.slug, companyId, pipelineId);
        if (!cancelled) setCreateStages(result);
      } catch {
        if (!cancelled) setCreateStages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, getAccessToken, pipelineId, selection.slug]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPipelineId("");
    setStageId("");
    setLeadId("");
    setCustomerId("");
    setAmount("");
    setCurrency("USD");
    setExpectedCloseDate("");
    setFormError(undefined);
    setModalOpen(true);
  };

  const openEdit = (opportunity: OpportunityResponse) => {
    setEditing(opportunity);
    setName(opportunity.name);
    setAmount(opportunity.amount);
    setExpectedCloseDate(opportunity.expectedCloseDate ? opportunity.expectedCloseDate.slice(0, 10) : "");
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
        const updated = await apiClient.updateOpportunity(accessToken, selection.slug, companyId, editing.id, {
          name,
          amount,
          expectedCloseDate: expectedCloseDate || undefined,
        });
        onOpportunitiesChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
      } else {
        const created = await apiClient.createOpportunity(accessToken, selection.slug, companyId, {
          name,
          pipelineId,
          stageId,
          leadId: leadId || undefined,
          customerId: customerId || undefined,
          amount,
          currency,
          expectedCloseDate: expectedCloseDate || undefined,
        });
        onOpportunitiesChanged((current) => [...(current ?? []), created]);
      }
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Oportunidades de venta de la empresa activa.</p>
        <Button type="button" onClick={openCreate} disabled={!pipelines || pipelines.length === 0}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva oportunidad
        </Button>
      </div>
      {!pipelines || pipelines.length === 0 ? (
        <ErrorNotice message="Todavía no hay pipelines. Crea uno en la pestaña Pipelines antes de registrar oportunidades." />
      ) : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={opportunities === null}>
          <TableCaption>Oportunidades</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Pipeline</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities === null ? (
              <LoadingRows columns={5} />
            ) : opportunities.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay oportunidades" />
              </TableRow>
            ) : (
              opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell className="text-[12px] font-semibold">{opportunity.name}</TableCell>
                  <TableCell className="text-[12px]">{pipelineName(pipelines ?? [], opportunity.pipelineId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {opportunity.amount} {opportunity.currency}
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(opportunity.status === "OPEN")}`}>
                      {opportunityStatusLabel(opportunity.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openEdit(opportunity)} disabled={opportunity.status !== "OPEN"}>
                        <PencilSimple size={16} weight="bold" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3"
                        onClick={() => setMovingStage(opportunity)}
                        disabled={opportunity.status !== "OPEN"}
                      >
                        <ArrowRight size={16} weight="bold" aria-hidden="true" />
                        Mover
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
        title={editing ? "Editar oportunidad" : "Nueva oportunidad"}
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="opportunity-form" busy={busy} disabled={!editing && (!pipelineId || !stageId)}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </>
        }
      >
        <form
          id="opportunity-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="opportunity-name" label="Nombre" value={name} autoFocus required onChange={(event) => setName(event.target.value)} />
          {!editing ? (
            <>
              <Select name="opportunity-pipeline" label="Pipeline" value={pipelineId} required onChange={(event) => setPipelineId(event.target.value)}>
                <option value="">Selecciona un pipeline</option>
                {(pipelines ?? []).map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </Select>
              <Select
                name="opportunity-stage"
                label="Etapa inicial"
                value={stageId}
                required
                disabled={!pipelineId}
                onChange={(event) => setStageId(event.target.value)}
              >
                <option value="">{pipelineId ? "Selecciona una etapa" : "Selecciona un pipeline primero"}</option>
                {(createStages ?? []).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
              <Select
                name="opportunity-lead"
                label="Prospecto de origen (opcional)"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
              >
                <option value="">Sin prospecto de origen</option>
                {(leads ?? []).map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </Select>
              <FormField
                name="opportunity-customer"
                label="ID de cliente (opcional)"
                hint="ID del cliente ya existente en Contactos"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              />
            </>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="opportunity-amount" label="Monto" placeholder="5000.0000" value={amount} required onChange={(event) => setAmount(event.target.value)} />
            {!editing ? (
              <FormField name="opportunity-currency" label="Moneda" value={currency} required maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
            ) : (
              <FormField
                name="opportunity-close-date"
                label="Cierre esperado"
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
              />
            )}
          </div>
          {!editing ? (
            <FormField
              name="opportunity-close-date-create"
              label="Cierre esperado (opcional)"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
            />
          ) : null}
        </form>
      </Modal>

      <MoveStageModal
        opportunity={movingStage}
        selection={selection}
        companyId={companyId}
        onOpenChange={(open) => !open && setMovingStage(null)}
        onMoved={(updated) => {
          onOpportunitiesChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
          setMovingStage(null);
        }}
      />
    </section>
  );
}
