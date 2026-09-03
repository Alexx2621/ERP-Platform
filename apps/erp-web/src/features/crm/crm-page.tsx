import { ArrowLeft, CheckSquare, ChartLineUp, Target, UserPlus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { LeadResponse, OpportunityResponse, PipelineResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { ActivitiesPanel } from "./activities-panel";
import { LeadsPanel } from "./leads-panel";
import { OpportunitiesPanel } from "./opportunities-panel";
import { PipelinesPanel } from "./pipelines-panel";
import { isAbortError, type WorkspaceSelection } from "./crm-shared";

interface CrmPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function CrmPage({ selection, navigate }: CrmPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="CRM"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar el CRM." />
        </div>
      </ProductShell>
    );
  }

  return <CrmWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface CrmWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function CrmWorkspace({ selection, companyId, navigate }: CrmWorkspaceProps) {
  const { getAccessToken } = useAuth();
  // Leads, pipelines and opportunities are loaded once here, unconditionally
  // — not lazily per tab — because the Actividades tab needs the same Leads
  // and Opportunities lists for its relation selects, and the Oportunidades
  // tab needs the same Pipelines list for its pipeline selects, regardless
  // of which tab is active by default. Same lesson POS's own register list
  // already found and fixed (session 30), applied proactively here.
  const [leads, setLeads] = useState<LeadResponse[] | null>(null);
  const [pipelines, setPipelines] = useState<PipelineResponse[] | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityResponse[] | null>(null);
  const [leadsError, setLeadsError] = useState<string>();
  const [pipelinesError, setPipelinesError] = useState<string>();
  const [opportunitiesError, setOpportunitiesError] = useState<string>();
  const [activeTab, setActiveTab] = useState("leads");

  const loadLeads = useCallback(
    async (signal?: AbortSignal) => {
      setLeadsError(undefined);
      try {
        const accessToken = await getAccessToken();
        setLeads(await apiClient.listLeads(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setLeadsError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadPipelines = useCallback(
    async (signal?: AbortSignal) => {
      setPipelinesError(undefined);
      try {
        const accessToken = await getAccessToken();
        setPipelines(await apiClient.listPipelines(accessToken, selection.slug, companyId, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setPipelinesError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadOpportunities = useCallback(
    async (signal?: AbortSignal) => {
      setOpportunitiesError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOpportunities(await apiClient.listOpportunities(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setOpportunitiesError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadLeads(controller.signal);
    void loadPipelines(controller.signal);
    void loadOpportunities(controller.signal);
    return () => controller.abort();
  }, [loadLeads, loadPipelines, loadOpportunities]);

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="CRM"
      description="Prospectos, pipelines de venta, oportunidades y actividades de la empresa activa."
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
          ariaLabel="Administración de CRM"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            {
              id: "leads",
              label: (
                <span className="flex items-center gap-2">
                  <UserPlus size={16} aria-hidden="true" />
                  Prospectos
                </span>
              ),
              panel: (
                <LeadsPanel
                  selection={selection}
                  companyId={companyId}
                  leads={leads}
                  error={leadsError}
                  onRetry={() => void loadLeads()}
                  onLeadsChanged={(updater) => setLeads(updater)}
                />
              ),
            },
            {
              id: "pipelines",
              label: (
                <span className="flex items-center gap-2">
                  <ChartLineUp size={16} aria-hidden="true" />
                  Pipelines
                </span>
              ),
              panel: (
                <PipelinesPanel
                  selection={selection}
                  companyId={companyId}
                  pipelines={pipelines}
                  error={pipelinesError}
                  onRetry={() => void loadPipelines()}
                  onPipelinesChanged={(updater) => setPipelines(updater)}
                />
              ),
            },
            {
              id: "opportunities",
              label: (
                <span className="flex items-center gap-2">
                  <Target size={16} aria-hidden="true" />
                  Oportunidades
                </span>
              ),
              panel: (
                <OpportunitiesPanel
                  selection={selection}
                  companyId={companyId}
                  pipelines={pipelines}
                  leads={leads}
                  opportunities={opportunities}
                  error={opportunitiesError}
                  onRetry={() => void loadOpportunities()}
                  onOpportunitiesChanged={(updater) => setOpportunities(updater)}
                />
              ),
            },
            {
              id: "activities",
              label: (
                <span className="flex items-center gap-2">
                  <CheckSquare size={16} aria-hidden="true" />
                  Actividades
                </span>
              ),
              panel: (
                <ActivitiesPanel
                  selection={selection}
                  companyId={companyId}
                  leads={leads}
                  opportunities={opportunities}
                  active={activeTab === "activities"}
                />
              ),
            },
          ]}
        />
      </div>
    </ProductShell>
  );
}
