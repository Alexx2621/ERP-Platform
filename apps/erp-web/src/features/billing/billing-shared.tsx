import type { TenantSubscriptionStatus } from "@erp/api-client";
import type { StatusTone } from "../../shared/ui/status-badge";

/** Real Recurrente subscription event types this codebase actually handles or stores — see docs/DECISIONS.md ADR-016. */
const ACTIVITY_LABELS: Record<string, string> = {
  "subscription.create": "Suscripción activada",
  "subscription.reactivate": "Suscripción reactivada",
  "subscription.unpause": "Suscripción reanudada",
  "subscription.pause": "Suscripción pausada",
  "subscription.past_due": "Cobro automático fallido",
  "subscription.cancel": "Suscripción cancelada",
  "subscription.update": "Datos de la suscripción actualizados",
  "subscription.item_added": "Producto agregado a la suscripción",
  "subscription.item_removed": "Producto removido de la suscripción",
  "subscription.invoice_item_added": "Cargo agregado a la próxima factura",
};

export function activityLabel(eventType: string): string {
  return ACTIVITY_LABELS[eventType] ?? eventType;
}

const STATUS_LABELS: Record<TenantSubscriptionStatus, string> = {
  PENDING: "Pendiente de confirmación",
  ACTIVE: "Activa",
  PAST_DUE: "Pago atrasado",
  CANCELLED: "Cancelada",
};

export function subscriptionStatusLabel(status: TenantSubscriptionStatus): string {
  return STATUS_LABELS[status];
}

export function subscriptionStatusTone(status: TenantSubscriptionStatus): StatusTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAST_DUE":
      return "danger";
    case "PENDING":
      return "progress";
    case "CANCELLED":
      return "neutral";
  }
}
