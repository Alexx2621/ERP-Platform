import { ArrowUUpLeft, ListDashes, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AccountResponse, CreateJournalEntryLineInput, JournalEntryLineResponse, JournalEntryResponse } from "@erp/api-client";
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
import { accountLabel, formatDate, isAbortError, type WorkspaceSelection } from "./accounting-shared";

interface DraftLine extends CreateJournalEntryLineInput {
  key: string;
}

interface JournalEntriesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  accounts: AccountResponse[] | null;
  active: boolean;
}

interface DetailModalProps {
  entry: JournalEntryResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  accounts: AccountResponse[] | null;
  onOpenChange: (open: boolean) => void;
  onReversed: (reversal: JournalEntryResponse, original: JournalEntryResponse) => void;
}

function JournalEntryDetailModal({ entry, selection, companyId, accounts, onOpenChange, onReversed }: DetailModalProps) {
  const { getAccessToken } = useAuth();
  const [lines, setLines] = useState<JournalEntryLineResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!entry) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setLines(await apiClient.listJournalEntryLines(accessToken, selection.slug, companyId, entry.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, entry, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!entry) {
      setLines(null);
      setReverseError(undefined);
      return;
    }
    void load();
  }, [entry, load]);

  const reverse = async () => {
    if (!entry) return;
    setReverseError(undefined);
    setReversing(true);
    try {
      const accessToken = await getAccessToken();
      const reversal = await apiClient.reverseJournalEntry(accessToken, selection.slug, companyId, entry.id);
      onReversed(reversal, entry);
    } catch (caught) {
      setReverseError(getErrorMessage(caught));
    } finally {
      setReversing(false);
    }
  };

  return (
    <Modal
      open={Boolean(entry)}
      onOpenChange={(open) => !reversing && onOpenChange(open)}
      title={entry ? `Asiento · ${formatDate(entry.entryDate)}` : "Asiento"}
      description={entry?.description}
    >
      <div className="grid gap-6">
        {reverseError ? <ErrorNotice message={reverseError} /> : null}
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={lines === null}>
            <TableCaption>Líneas del asiento</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Cuenta</TableHead>
                <TableHead scope="col">Débito</TableHead>
                <TableHead scope="col">Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines === null ? (
                <LoadingRows columns={3} />
              ) : lines.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={3} title="Sin líneas" />
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-[12px] font-semibold">{accountLabel(accounts ?? [], line.accountId)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{line.debit}</TableCell>
                    <TableCell className="font-mono text-[11px]">{line.credit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {entry?.reversedByEntryId ? (
          <p className="text-[12px] font-semibold text-[var(--muted)]">Este asiento ya fue reversado.</p>
        ) : entry ? (
          <div className="border-t border-[var(--line)] pt-5">
            <Button type="button" variant="quiet" busy={reversing} onClick={() => void reverse()}>
              <ArrowUUpLeft size={16} weight="bold" aria-hidden="true" />
              Reversar asiento
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function JournalEntriesPanel({ selection, companyId, accounts, active }: JournalEntriesPanelProps) {
  const { getAccessToken } = useAuth();
  const [entries, setEntries] = useState<JournalEntryResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<JournalEntryResponse | null>(null);

  const [entryDate, setEntryDate] = useState("");
  const [description, setDescription] = useState("");
  const [lineAccountId, setLineAccountId] = useState("");
  const [lineDebit, setLineDebit] = useState("");
  const [lineCredit, setLineCredit] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setEntries(await apiClient.listJournalEntries(accessToken, selection.slug, companyId, {}, signal));
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

  const totalDebit = draftLines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const totalCredit = draftLines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
  const isBalanced = draftLines.length >= 2 && Math.abs(totalDebit - totalCredit) < 0.00005;

  const addDraftLine = () => {
    if (!lineAccountId || (!lineDebit && !lineCredit)) return;
    setDraftLines((current) => [
      ...current,
      { key: `${lineAccountId}-${current.length}`, accountId: lineAccountId, debit: lineDebit || undefined, credit: lineCredit || undefined },
    ]);
    setLineAccountId("");
    setLineDebit("");
    setLineCredit("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isBalanced) {
      setFormError("El asiento debe tener al menos dos líneas y los débitos deben igualar a los créditos.");
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createJournalEntry(accessToken, selection.slug, companyId, {
        entryDate,
        description,
        lines: draftLines.map(({ accountId, debit, credit, description: lineDescription }) => ({ accountId, debit, credit, description: lineDescription })),
      });
      setEntries((current) => [created, ...(current ?? [])]);
      setModalOpen(false);
      setEntryDate("");
      setDescription("");
      setDraftLines([]);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Asientos contables manuales de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)} disabled={!accounts || accounts.length === 0}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo asiento
        </Button>
      </div>
      {!accounts || accounts.length === 0 ? (
        <ErrorNotice message="Todavía no hay cuentas en el catálogo. Crea al menos dos cuentas en la pestaña Cuentas antes de contabilizar." />
      ) : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={entries === null}>
          <TableCaption>Asientos contables</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Descripción</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries === null ? (
              <LoadingRows columns={4} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Todavía no hay asientos contabilizados" />
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-[11px]">{formatDate(entry.entryDate)}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{entry.description}</TableCell>
                  <TableCell className="text-[11px] font-bold text-[var(--muted)]">
                    {entry.reversedByEntryId ? "Reversado" : entry.reversalOfEntryId ? "Reversión" : "Contabilizado"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setDetailEntry(entry)}>
                      <ListDashes size={16} weight="bold" aria-hidden="true" />
                      Ver
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
        title="Nuevo asiento contable"
        description="Cada línea afecta el débito o el crédito de una cuenta, nunca ambos. La suma de débitos debe igualar la suma de créditos."
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="journal-entry-form" busy={busy} disabled={!isBalanced}>
              Contabilizar
            </Button>
          </>
        }
      >
        <form
          id="journal-entry-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="entry-date" label="Fecha" type="date" value={entryDate} required onChange={(event) => setEntryDate(event.target.value)} />
          <FormField
            name="entry-description"
            label="Descripción"
            value={description}
            required
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="grid gap-4 border-t border-[var(--line)] pt-5">
            <p className="text-[12px] font-extrabold text-[var(--ink)]">Líneas</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select name="entry-line-account" label="Cuenta" value={lineAccountId} onChange={(event) => setLineAccountId(event.target.value)}>
                <option value="">Selecciona una cuenta</option>
                {(accounts ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </Select>
              <FormField
                name="entry-line-debit"
                label="Débito"
                value={lineDebit}
                placeholder="100.0000"
                onChange={(event) => {
                  setLineDebit(event.target.value);
                  if (event.target.value) setLineCredit("");
                }}
              />
              <FormField
                name="entry-line-credit"
                label="Crédito"
                value={lineCredit}
                placeholder="100.0000"
                onChange={(event) => {
                  setLineCredit(event.target.value);
                  if (event.target.value) setLineDebit("");
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-fit"
              onClick={addDraftLine}
              disabled={!lineAccountId || (!lineDebit && !lineCredit)}
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
              Agregar línea
            </Button>

            {draftLines.length > 0 ? (
              <ul className="grid gap-2">
                {draftLines.map((line, index) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--ink)]"
                  >
                    <span>
                      {accountLabel(accounts ?? [], line.accountId)} · {line.debit ? `Débito ${line.debit}` : `Crédito ${line.credit}`}
                    </span>
                    <button
                      type="button"
                      className="text-[var(--muted-strong)] hover:text-[var(--danger)]"
                      onClick={() => setDraftLines((current) => current.filter((_, i) => i !== index))}
                      aria-label="Quitar línea"
                    >
                      <Trash size={16} weight="bold" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className={`text-[12px] font-bold ${isBalanced ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
              Débitos: {totalDebit.toFixed(4)} · Créditos: {totalCredit.toFixed(4)} {isBalanced ? "· Balanceado" : ""}
            </p>
          </div>
        </form>
      </Modal>

      <JournalEntryDetailModal
        entry={detailEntry}
        selection={selection}
        companyId={companyId}
        accounts={accounts}
        onOpenChange={(open) => !open && setDetailEntry(null)}
        onReversed={(reversal, original) => {
          setEntries((current) => [
            reversal,
            ...(current ?? []).map((existing) => (existing.id === original.id ? { ...existing, reversedByEntryId: reversal.id } : existing)),
          ]);
          setDetailEntry(null);
        }}
      />
    </section>
  );
}
