import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import type { TrialBalanceResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { ErrorNotice } from "../../shared/ui/notice";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { accountTypeLabel, type WorkspaceSelection } from "./accounting-shared";

interface TrialBalancePanelProps {
  selection: WorkspaceSelection;
  companyId: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TrialBalancePanel({ selection, companyId }: TrialBalancePanelProps) {
  const { getAccessToken } = useAuth();
  const [asOfDate, setAsOfDate] = useState(today());
  const [result, setResult] = useState<TrialBalanceResponse | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      setResult(await apiClient.getTrialBalance(accessToken, selection.slug, companyId, asOfDate));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <p className="text-[12px] font-medium text-[var(--muted-strong)]">
        Suma de débitos y créditos por cuenta desde el ledger real de asientos, hasta la fecha indicada.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField name="trial-balance-date" label="Al día" type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
        <Button type="button" busy={busy} className="w-fit" onClick={() => void run()}>
          <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
          Consultar
        </Button>
      </div>
      {error ? <ErrorNotice message={error} /> : null}
      {result ? (
        <div className="grid gap-3">
          <Table>
            <TableCaption>Balance de comprobación</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Código</TableHead>
                <TableHead scope="col">Cuenta</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Débito</TableHead>
                <TableHead scope="col">Crédito</TableHead>
                <TableHead scope="col">Neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={6} title="Sin movimientos hasta esta fecha" />
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.accountId}>
                    <TableCell className="font-mono text-[11px]">{row.accountCode}</TableCell>
                    <TableCell className="text-[12px] font-semibold">{row.accountName}</TableCell>
                    <TableCell className="text-[12px]">{accountTypeLabel(row.accountType)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{row.totalDebit}</TableCell>
                    <TableCell className="font-mono text-[11px]">{row.totalCredit}</TableCell>
                    <TableCell className="font-mono text-[11px] font-bold">{row.netAmount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className={`text-[12px] font-bold ${result.isBalanced ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
            Total débito: {result.totalDebit} · Total crédito: {result.totalCredit} ·{" "}
            {result.isBalanced ? "Balanceado" : "No balanceado"}
          </p>
        </div>
      ) : null}
    </section>
  );
}
