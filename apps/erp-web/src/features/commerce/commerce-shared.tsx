import type { TenantSummary } from "@erp/api-client";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const STOREFRONT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
};

export function storefrontStatusLabel(status: string): string {
  return STOREFRONT_STATUS_LABELS[status] ?? status;
}

export function statusToneClass(active: boolean): string {
  return active ? "text-[var(--accent)]" : "text-[var(--muted)]";
}
