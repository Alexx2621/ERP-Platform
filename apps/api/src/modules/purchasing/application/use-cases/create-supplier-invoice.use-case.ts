import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { SupplierInvoice } from "../../domain/supplier-invoice.entity";
import { SUPPLIER_INVOICE_REPOSITORY, SupplierInvoiceRepository } from "../../domain/supplier-invoice.repository";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { PurchaseOrderNotFoundError, SupplierInvoiceOrderMismatchError } from "../errors";
import { ResolveSupplierTargetUseCase } from "./resolve-supplier-target.use-case";

export interface CreateSupplierInvoiceInput {
  tenantId: string;
  companyId: string;
  supplierId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
}

/**
 * Records the supplier's own invoice as its own document
 * (docs/ROADMAP.md §9), traced to a `PurchaseOrder` for reference but never
 * validated against its lines' totals — see `SupplierInvoice`'s docstring
 * for why. `purchaseOrderId` must actually belong to the given
 * `supplierId` — a real, load-bearing cross-check, not a redundant one:
 * without it, an invoice could be recorded against a competitor's order by
 * mistake.
 */
@Injectable()
export class CreateSupplierInvoiceUseCase {
  constructor(
    @Inject(SUPPLIER_INVOICE_REPOSITORY) private readonly invoices: SupplierInvoiceRepository,
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    private readonly resolveSupplier: ResolveSupplierTargetUseCase,
  ) {}

  async execute(input: CreateSupplierInvoiceInput): Promise<SupplierInvoice> {
    await this.resolveSupplier.execute(input.tenantId, input.companyId, input.supplierId);

    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.supplierId !== input.supplierId) {
      throw new SupplierInvoiceOrderMismatchError();
    }

    const now = new Date();
    const invoice = SupplierInvoice.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      supplierId: input.supplierId,
      purchaseOrderId: order.id,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      currency: input.currency,
      issueDate: new Date(input.issueDate),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: "RECORDED",
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    });
    await this.invoices.save(invoice);
    return invoice;
  }
}
