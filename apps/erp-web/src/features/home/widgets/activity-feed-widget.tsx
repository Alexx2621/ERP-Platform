import {
  Warehouse,
  Calculator,
  Coins,
  Factory,
  Globe,
  Handshake,
  Package,
  ShoppingCartSimple,
  Storefront,
  Tag,
  Truck,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type { DashboardData } from "../use-dashboard-data";

/**
 * Every real audit action this codebase's business modules emit (grepped
 * from `src/modules/**` at the time this widget was built — see
 * `docs/PROJECT_STATE.md`) mapped to a short, human sentence fragment. An
 * action added later that isn't in this map still renders — see the
 * fallback in `actionLabel` — it just shows the raw code instead of Spanish
 * prose, the same "never crash on an unmapped value" rule
 * `platform-admin-page.tsx`'s own `actionLabel` already follows.
 */
const ACTION_LABELS: Record<string, string> = {
  "sales.quote.created": "Nueva cotización",
  "sales.quote.converted": "Cotización convertida a pedido",
  "sales.quote.cancelled": "Cotización cancelada",
  "sales.quote_line.added": "Línea agregada a una cotización",
  "sales.order.created": "Nuevo pedido de venta",
  "sales.order.confirmed": "Pedido confirmado",
  "sales.order.fulfilled": "Pedido despachado",
  "sales.order.cancelled": "Pedido cancelado",
  "sales.order_line.added": "Línea agregada a un pedido",
  "sales.return.created": "Devolución de venta registrada",
  "payments.payment.captured": "Pago cobrado",
  "payments.payment.refunded": "Pago reembolsado",
  "purchasing.order.created": "Nueva orden de compra",
  "purchasing.order.confirmed": "Orden de compra confirmada",
  "purchasing.order.closed": "Orden de compra cerrada",
  "purchasing.order.cancelled": "Orden de compra cancelada",
  "purchasing.order_line.added": "Línea agregada a una compra",
  "purchasing.receipt.created": "Recepción de mercadería registrada",
  "purchasing.return.created": "Devolución a proveedor registrada",
  "purchasing.supplier_invoice.created": "Factura de proveedor registrada",
  "purchasing.supplier_invoice.cancelled": "Factura de proveedor cancelada",
  "pos.register.created": "Nueva caja registradora",
  "pos.register.status_changed": "Caja registradora actualizada",
  "pos.shift.opened": "Turno de caja abierto",
  "pos.shift.closed": "Turno de caja cerrado",
  "pos.cash_movement.recorded": "Movimiento de efectivo registrado",
  "pos.sale.rung_up": "Venta cobrada en punto de venta",
  "pos.return.created": "Devolución en punto de venta",
  "inventory.movement.receipt": "Recepción de inventario",
  "inventory.movement.issue": "Salida de inventario",
  "inventory.movement.return": "Devolución de inventario",
  "inventory.movement.adjustment": "Ajuste de inventario",
  "inventory.reservation.created": "Existencias reservadas",
  "inventory.reservation.released": "Reserva de existencias liberada",
  "inventory.transfer.created": "Traslado entre bodegas iniciado",
  "inventory.transfer.completed": "Traslado entre bodegas completado",
  "inventory.transfer.cancelled": "Traslado entre bodegas cancelado",
  "commerce.storefront.created": "Nueva tienda en línea",
  "commerce.storefront.status_changed": "Tienda en línea actualizada",
  "commerce.storefront_product.published": "Producto publicado en tienda",
  "commerce.storefront_product.unpublished": "Producto despublicado de tienda",
  "crm.lead.created": "Nuevo prospecto",
  "crm.lead.updated": "Prospecto actualizado",
  "crm.lead.status_changed": "Estado de prospecto cambiado",
  "crm.lead.converted": "Prospecto convertido a cliente",
  "crm.lead.consent_changed": "Consentimiento de prospecto actualizado",
  "crm.opportunity.created": "Nueva oportunidad",
  "crm.opportunity.updated": "Oportunidad actualizada",
  "crm.opportunity.stage_moved": "Oportunidad movida de etapa",
  "crm.pipeline.created": "Nuevo pipeline de ventas",
  "crm.pipeline.status_changed": "Pipeline actualizado",
  "crm.pipeline_stage.added": "Etapa agregada a un pipeline",
  "crm.activity.created": "Nueva actividad de CRM",
  "crm.activity.completed": "Actividad de CRM completada",
  "manufacturing.bill_of_material.created": "Nueva lista de materiales",
  "manufacturing.bill_of_material.status_changed": "Lista de materiales actualizada",
  "manufacturing.order.created": "Nueva orden de producción",
  "manufacturing.order.confirmed": "Orden de producción confirmada",
  "manufacturing.order.closed": "Orden de producción cerrada",
  "manufacturing.order.cancelled": "Orden de producción cancelada",
  "manufacturing.material.issued": "Materiales emitidos a producción",
  "manufacturing.material.returned": "Materiales devueltos de producción",
  "manufacturing.finished_goods.received": "Producto terminado recibido",
  "manufacturing.operation.added": "Operación agregada a producción",
  "manufacturing.operation.completed": "Operación de producción completada",
  "accounting.account.created": "Nueva cuenta contable",
  "accounting.account.updated": "Cuenta contable actualizada",
  "accounting.account.status_changed": "Cuenta contable actualizada",
  "accounting.fiscal_period.created": "Nuevo período fiscal",
  "accounting.fiscal_period.closed": "Período fiscal cerrado",
  "accounting.journal_entry.posted": "Asiento contable registrado",
  "accounting.journal_entry.reversed": "Asiento contable reversado",
  "customers.customer.created": "Nuevo cliente",
  "customers.customer.updated": "Cliente actualizado",
  "customers.customer.status_changed": "Estado de cliente cambiado",
  "suppliers.supplier.created": "Nuevo proveedor",
  "suppliers.supplier.updated": "Proveedor actualizado",
  "suppliers.supplier.status_changed": "Estado de proveedor cambiado",
  "catalog.product.created": "Nuevo producto",
  "catalog.product.updated": "Producto actualizado",
  "catalog.product.status_changed": "Estado de producto cambiado",
  "catalog.product_variant.created": "Nueva variante de producto",
  "catalog.product_variant.updated": "Variante de producto actualizada",
  "catalog.product_variant.status_changed": "Variante de producto actualizada",
  "catalog.category.created": "Nueva categoría",
  "catalog.brand.created": "Nueva marca",
  "catalog.unit_of_measure.created": "Nueva unidad de medida",
  "warehouses.warehouse.created": "Nueva bodega",
  "warehouses.warehouse.updated": "Bodega actualizada",
  "taxes.tax.created": "Nuevo impuesto",
  "pricing.price_list.created": "Nueva lista de precios",
  "pricing.price_list_item.added": "Producto agregado a lista de precios",
};

const MODULE_ICONS: Record<string, Icon> = {
  sales: ShoppingCartSimple,
  payments: Coins,
  purchasing: Truck,
  pos: Storefront,
  inventory: Warehouse,
  commerce: Globe,
  crm: Handshake,
  manufacturing: Factory,
  accounting: Calculator,
  customers: Users,
  suppliers: Truck,
  catalog: Package,
  warehouses: Warehouse,
  taxes: Tag,
  pricing: Tag,
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function moduleIcon(action: string): Icon {
  const prefix = action.split(".")[0] ?? "";
  return MODULE_ICONS[prefix] ?? Package;
}

/** "hace 5 minutos" / "hace 3 horas" / "hace 2 días" — coarse on purpose,
 * this is a glance-at feed, not a precision timestamp. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return "justo ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

interface ActivityFeedWidgetProps {
  data: DashboardData;
}

export function ActivityFeedWidget({ data }: ActivityFeedWidgetProps) {
  if (!data.auditEntries) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">No disponible</p>;
  }
  if (data.auditEntries.length === 0) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">Todavía no hay actividad registrada.</p>;
  }

  return (
    <ul className="grid gap-3">
      {data.auditEntries.slice(0, 8).map((entry) => {
        const EntryIcon = moduleIcon(entry.action);
        return (
          <li key={entry.id} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
              <EntryIcon size={14} weight="bold" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold text-[var(--ink)]">{actionLabel(entry.action)}</p>
              <p className="text-[11px] font-medium text-[var(--muted)]">{relativeTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
