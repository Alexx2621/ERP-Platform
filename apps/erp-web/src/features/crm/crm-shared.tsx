import type { TenantSummary } from "@erp/api-client";
import type { StatusTone } from "../../shared/ui/status-badge";

export interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierta",
  WON: "Ganada",
  LOST: "Perdida",
};

export function opportunityStatusLabel(status: string): string {
  return OPPORTUNITY_STATUS_LABELS[status] ?? status;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Llamada",
  EMAIL: "Correo",
  MEETING: "Reunión",
  NOTE: "Nota",
  TASK: "Tarea",
};

export function activityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

export function leadStatusTone(status: string): StatusTone {
  if (status === "CONVERTED") return "success";
  if (status === "LOST") return "danger";
  return "progress";
}

export function opportunityStatusTone(status: string): StatusTone {
  if (status === "WON") return "success";
  if (status === "LOST") return "danger";
  return "progress";
}

/** Generic yes/no indicator (consent flags, completed-vs-pending activities) — not tied to a specific status enum. */
export function booleanStatusTone(active: boolean): StatusTone {
  return active ? "success" : "neutral";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}
