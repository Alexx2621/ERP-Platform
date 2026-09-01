import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { ResolveSupplierTargetUseCase } from "./resolve-supplier-target.use-case";

export interface CreatePurchaseOrderInput {
  tenantId: string;
  companyId: string;
  supplierId: string;
  currency: string;
  notes?: string | null;
}

@Injectable()
export class CreatePurchaseOrderUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    private readonly resolveSupplier: ResolveSupplierTargetUseCase,
  ) {}

  async execute(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    await this.resolveSupplier.execute(input.tenantId, input.companyId, input.supplierId);

    const now = new Date();
    const order = PurchaseOrder.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      supplierId: input.supplierId,
      status: "DRAFT",
      currency: input.currency,
      notes: input.notes ?? null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      closedAt: null,
      cancelledAt: null,
    });
    await this.purchaseOrders.save(order);
    return order;
  }
}
