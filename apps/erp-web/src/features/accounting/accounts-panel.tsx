import { Plus, ToggleLeft, ToggleRight } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { AccountResponse, AccountType } from "@erp/api-client";
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
import { accountTypeLabel, normalBalanceLabel, statusToneClass, type WorkspaceSelection } from "./accounting-shared";

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

interface AccountsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  accounts: AccountResponse[] | null;
  error?: string;
  onRetry: () => void;
  onAccountsChanged: (accounts: AccountResponse[]) => void;
}

/**
 * Deliberately a "dumb" list view — `accounts` is loaded once at the page
 * level (`AccountingPage`), not lazily on this tab's own activation, since
 * the Journal Entries tab also needs the same list for its line account
 * selects. A per-tab lazy fetch here would repeat the exact bug POS's own
 * register list already found and fixed (session 30): whichever tab is
 * active by default would render its selects empty until the user first
 * visited "Cuentas".
 */
export function AccountsPanel({ selection, companyId, accounts, error, onRetry, onAccountsChanged }: AccountsPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string>();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("ASSET");
  const [parentAccountId, setParentAccountId] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createAccount(accessToken, selection.slug, companyId, {
        code,
        name,
        type,
        parentAccountId: parentAccountId || undefined,
      });
      onAccountsChanged([...(accounts ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setType("ASSET");
      setParentAccountId("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const [actionError, setActionError] = useState<string>();

  const toggleStatus = async (account: AccountResponse) => {
    setActionError(undefined);
    setBusyId(account.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setAccountStatus(accessToken, selection.slug, companyId, account.id, {
        status: account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      onAccountsChanged((accounts ?? []).map((a) => (a.id === updated.id ? updated : a)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Catálogo de cuentas contables de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva cuenta
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
        <Table aria-busy={accounts === null}>
          <TableCaption>Cuentas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Naturaleza</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts === null ? (
              <LoadingRows columns={6} />
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay cuentas en el catálogo" />
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-[11px]">{account.code}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{account.name}</TableCell>
                  <TableCell className="text-[12px]">{accountTypeLabel(account.type)}</TableCell>
                  <TableCell className="text-[12px]">{normalBalanceLabel(account.normalBalance)}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(account.status === "ACTIVE")}`}>
                      {account.status === "ACTIVE" ? "Activa" : "Inactiva"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3"
                      busy={busyId === account.id}
                      onClick={() => void toggleStatus(account)}
                    >
                      {account.status === "ACTIVE" ? (
                        <ToggleRight size={16} weight="fill" aria-hidden="true" />
                      ) : (
                        <ToggleLeft size={16} weight="bold" aria-hidden="true" />
                      )}
                      {account.status === "ACTIVE" ? "Desactivar" : "Activar"}
                    </Button>
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
        title="Nueva cuenta"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="account-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="account-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="account-code" label="Código" value={code} required maxLength={50} onChange={(event) => setCode(event.target.value)} />
          <FormField name="account-name" label="Nombre" value={name} required maxLength={150} onChange={(event) => setName(event.target.value)} />
          <Select name="account-type" label="Tipo" value={type} required onChange={(event) => setType(event.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((accountType) => (
              <option key={accountType} value={accountType}>
                {accountTypeLabel(accountType)}
              </option>
            ))}
          </Select>
          <Select
            name="account-parent"
            label="Cuenta padre (opcional)"
            value={parentAccountId}
            onChange={(event) => setParentAccountId(event.target.value)}
          >
            <option value="">Sin cuenta padre</option>
            {(accounts ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {account.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>
    </section>
  );
}
