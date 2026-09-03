import { ChartBar, ListDashes, Plus, ToggleLeft, ToggleRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PipelineResponse, PipelineStageResponse, PipelineSummaryResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { statusToneClass, type WorkspaceSelection } from "./crm-shared";

interface StagesModalProps {
  pipeline: PipelineResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
}

function StagesModal({ pipeline, selection, companyId, onOpenChange }: StagesModalProps) {
  const { getAccessToken } = useAuth();
  const [stages, setStages] = useState<PipelineStageResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [name, setName] = useState("");
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!pipeline) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setStages(await apiClient.listPipelineStages(accessToken, selection.slug, companyId, pipeline.id, signal));
      } catch (caught) {
        setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, pipeline, selection.slug],
  );

  useEffect(() => {
    if (!pipeline) {
      setStages(null);
      setName("");
      setIsWon(false);
      setIsLost(false);
      return;
    }
    void load();
  }, [pipeline, load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pipeline) return;
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addPipelineStage(accessToken, selection.slug, companyId, pipeline.id, { name, isWon, isLost });
      setStages((current) => [...(current ?? []), created]);
      setName("");
      setIsWon(false);
      setIsLost(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(pipeline)} onOpenChange={onOpenChange} title={pipeline ? `Etapas · ${pipeline.name}` : "Etapas"}>
      <div className="grid gap-6">
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={stages === null}>
            <TableCaption>Etapas</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nombre</TableHead>
                <TableHead scope="col">Orden</TableHead>
                <TableHead scope="col">Cierre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages === null ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-[12px] text-[var(--muted)]">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : stages.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={3} title="Sin etapas todavía" />
                </TableRow>
              ) : (
                stages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell className="text-[12px] font-semibold">{stage.name}</TableCell>
                    <TableCell className="font-mono text-[11px]">{stage.sortOrder}</TableCell>
                    <TableCell className="text-[11px] font-bold text-[var(--muted)]">
                      {stage.isWon ? "Ganada" : stage.isLost ? "Perdida" : "—"}
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
          {formError ? <ErrorNotice message={formError} /> : null}
          <p className="text-[12px] font-extrabold text-[var(--ink)]">Nueva etapa</p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <FormField name="stage-name" label="Nombre" value={name} required onChange={(event) => setName(event.target.value)} />
            <label className="flex items-center gap-2 self-end pb-3 text-[12px] font-bold text-[var(--ink)]">
              <input type="checkbox" checked={isWon} onChange={(event) => setIsWon(event.target.checked)} />
              Gana
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-[12px] font-bold text-[var(--ink)]">
              <input type="checkbox" checked={isLost} onChange={(event) => setIsLost(event.target.checked)} />
              Pierde
            </label>
            <Button type="submit" busy={busy} className="self-end">
              <Plus size={16} weight="bold" aria-hidden="true" />
              Agregar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

interface SummaryModalProps {
  pipeline: PipelineResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
}

function SummaryModal({ pipeline, selection, companyId, onOpenChange }: SummaryModalProps) {
  const { getAccessToken } = useAuth();
  const [summary, setSummary] = useState<PipelineSummaryResponse | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!pipeline) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.getPipelineSummary(accessToken, selection.slug, companyId, pipeline.id);
        if (!cancelled) setSummary(result);
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, getAccessToken, pipeline, selection.slug]);

  return (
    <Modal open={Boolean(pipeline)} onOpenChange={onOpenChange} title={pipeline ? `Resumen · ${pipeline.name}` : "Resumen"}>
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <div className="grid gap-4">
          <Table aria-busy={summary === null}>
            <TableCaption>Oportunidades abiertas por etapa</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Etapa</TableHead>
                <TableHead scope="col">Cantidad</TableHead>
                <TableHead scope="col">Monto abierto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary === null ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-[12px] text-[var(--muted)]">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : summary.rows.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={3} title="Sin oportunidades abiertas" />
                </TableRow>
              ) : (
                summary.rows.map((row) => (
                  <TableRow key={row.stageId}>
                    <TableCell className="text-[12px] font-semibold">{row.stageName}</TableCell>
                    <TableCell className="font-mono text-[11px]">{row.openCount}</TableCell>
                    <TableCell className="font-mono text-[11px]">{row.openAmountTotal}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {summary ? <p className="text-[12px] font-bold text-[var(--ink)]">Total abierto: {summary.totalOpenAmount}</p> : null}
        </div>
      )}
    </Modal>
  );
}

interface PipelinesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  pipelines: PipelineResponse[] | null;
  error?: string;
  onRetry: () => void;
  onPipelinesChanged: (updater: (current: PipelineResponse[] | null) => PipelineResponse[] | null) => void;
}

/**
 * `pipelines` is loaded once at the page level (`CrmPage`) — the
 * Oportunidades tab needs the same list for its pipeline selects regardless
 * of which tab is active by default.
 */
export function PipelinesPanel({ selection, companyId, pipelines, error, onRetry, onPipelinesChanged }: PipelinesPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [stagesFor, setStagesFor] = useState<PipelineResponse | null>(null);
  const [summaryFor, setSummaryFor] = useState<PipelineResponse | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPipeline(accessToken, selection.slug, companyId, { code, name });
      onPipelinesChanged((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (pipeline: PipelineResponse) => {
    setActionError(undefined);
    setBusyId(pipeline.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setPipelineStatus(accessToken, selection.slug, companyId, pipeline.id, {
        status: pipeline.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      onPipelinesChanged((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Embudos de venta configurables de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo pipeline
        </Button>
      </div>
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={pipelines === null}>
          <TableCaption>Pipelines</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines === null ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-[12px] text-[var(--muted)]">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : pipelines.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Todavía no hay pipelines" />
              </TableRow>
            ) : (
              pipelines.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell className="font-mono text-[11px]">{pipeline.code}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{pipeline.name}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(pipeline.status === "ACTIVE")}`}>
                      {pipeline.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setStagesFor(pipeline)}>
                        <ListDashes size={16} weight="bold" aria-hidden="true" />
                        Etapas
                      </Button>
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setSummaryFor(pipeline)}>
                        <ChartBar size={16} weight="bold" aria-hidden="true" />
                        Resumen
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3"
                        busy={busyId === pipeline.id}
                        onClick={() => void toggleStatus(pipeline)}
                      >
                        {pipeline.status === "ACTIVE" ? (
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
        title="Nuevo pipeline"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="pipeline-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="pipeline-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="pipeline-code" label="Código" value={code} required maxLength={50} onChange={(event) => setCode(event.target.value)} />
          <FormField name="pipeline-name" label="Nombre" value={name} required maxLength={150} onChange={(event) => setName(event.target.value)} />
        </form>
      </Modal>

      <StagesModal pipeline={stagesFor} selection={selection} companyId={companyId} onOpenChange={(open) => !open && setStagesFor(null)} />
      <SummaryModal pipeline={summaryFor} selection={selection} companyId={companyId} onOpenChange={(open) => !open && setSummaryFor(null)} />
    </section>
  );
}
