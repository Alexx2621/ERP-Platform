import type { AccountResponse, TenantSummary } from "@erp/api-client";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  REVENUE: "Ingreso",
  EXPENSE: "Gasto",
};

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

const NORMAL_BALANCE_LABELS: Record<string, string> = {
  DEBIT: "Débito",
  CREDIT: "Crédito",
};

export function normalBalanceLabel(normalBalance: string): string {
  return NORMAL_BALANCE_LABELS[normalBalance] ?? normalBalance;
}

const FISCAL_PERIOD_STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierto",
  CLOSED: "Cerrado",
};

export function fiscalPeriodStatusLabel(status: string): string {
  return FISCAL_PERIOD_STATUS_LABELS[status] ?? status;
}

export function statusToneClass(active: boolean): string {
  return active ? "text-[var(--accent)]" : "text-[var(--muted)]";
}

export function accountLabel(accounts: AccountResponse[], accountId: string): string {
  const account = accounts.find((a) => a.id === accountId);
  return account ? `${account.code} · ${account.name}` : accountId;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}
