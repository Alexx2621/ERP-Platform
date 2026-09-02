import { ArrowLeft, Bank, CalendarBlank, ChartBar, ListDashes } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { AccountResponse, FiscalPeriodResponse } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { Tabs } from "../../shared/ui/tabs";
import { AccountsPanel } from "./accounts-panel";
import { FiscalPeriodsPanel } from "./fiscal-periods-panel";
import { JournalEntriesPanel } from "./journal-entries-panel";
import { TrialBalancePanel } from "./trial-balance-panel";
import { isAbortError, type WorkspaceSelection } from "./accounting-shared";

interface AccountingPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function AccountingPage({ selection, navigate }: AccountingPageProps) {
  const companyId = selection.companyId;

  if (!companyId) {
    return (
      <ProductShell
        eyebrow={`Tenant / ${selection.slug}`}
        title="Contabilidad"
        navigate={navigate}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Volver al workspace
          </Button>
        }
      >
        <div className="pt-7">
          <ErrorNotice message="Selecciona una empresa desde el selector de tenant para administrar la contabilidad." />
        </div>
      </ProductShell>
    );
  }

  return <AccountingWorkspace selection={selection} companyId={companyId} navigate={navigate} />;
}

interface AccountingWorkspaceProps {
  selection: WorkspaceSelection;
  companyId: string;
  navigate: (path: AppPath, replace?: boolean) => void;
}

function AccountingWorkspace({ selection, companyId, navigate }: AccountingWorkspaceProps) {
  const { getAccessToken } = useAuth();
  // Accounts and fiscal periods are loaded once here, unconditionally —
  // not lazily per tab — because the Journal Entries tab needs the same
  // Chart of Accounts for its line selects regardless of which tab is
  // active by default. A per-tab lazy fetch here would repeat the exact
  // bug POS's own register list already found and fixed (session 30).
  const [accounts, setAccounts] = useState<AccountResponse[] | null>(null);
  const [periods, setPeriods] = useState<FiscalPeriodResponse[] | null>(null);
  const [accountsError, setAccountsError] = useState<string>();
  const [periodsError, setPeriodsError] = useState<string>();
  const [activeTab, setActiveTab] = useState("accounts");

  const loadAccounts = useCallback(
    async (signal?: AbortSignal) => {
      setAccountsError(undefined);
      try {
        const accessToken = await getAccessToken();
        setAccounts(await apiClient.listAccounts(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setAccountsError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  const loadPeriods = useCallback(
    async (signal?: AbortSignal) => {
      setPeriodsError(undefined);
      try {
        const accessToken = await getAccessToken();
        setPeriods(await apiClient.listFiscalPeriods(accessToken, selection.slug, companyId, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setPeriodsError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAccounts(controller.signal);
    void loadPeriods(controller.signal);
    return () => controller.abort();
  }, [loadAccounts, loadPeriods]);

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Contabilidad"
      description="Catálogo de cuentas, períodos fiscales, asientos de partida doble y balance de comprobación de la empresa activa."
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
          ariaLabel="Administración de contabilidad"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            {
              id: "accounts",
              label: (
                <span className="flex items-center gap-2">
                  <Bank size={16} aria-hidden="true" />
                  Cuentas
                </span>
              ),
              panel: (
                <AccountsPanel
                  selection={selection}
                  companyId={companyId}
                  accounts={accounts}
                  error={accountsError}
                  onRetry={() => void loadAccounts()}
                  onAccountsChanged={setAccounts}
                />
              ),
            },
            {
              id: "periods",
              label: (
                <span className="flex items-center gap-2">
                  <CalendarBlank size={16} aria-hidden="true" />
                  Períodos
                </span>
              ),
              panel: (
                <FiscalPeriodsPanel
                  selection={selection}
                  companyId={companyId}
                  periods={periods}
                  error={periodsError}
                  onRetry={() => void loadPeriods()}
                  onPeriodsChanged={setPeriods}
                />
              ),
            },
            {
              id: "entries",
              label: (
                <span className="flex items-center gap-2">
                  <ListDashes size={16} aria-hidden="true" />
                  Asientos
                </span>
              ),
              panel: <JournalEntriesPanel selection={selection} companyId={companyId} accounts={accounts} active={activeTab === "entries"} />,
            },
            {
              id: "trial-balance",
              label: (
                <span className="flex items-center gap-2">
                  <ChartBar size={16} aria-hidden="true" />
                  Balance de comprobación
                </span>
              ),
              panel: <TrialBalancePanel selection={selection} companyId={companyId} />,
            },
          ]}
        />
      </div>
    </ProductShell>
  );
}
