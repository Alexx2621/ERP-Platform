import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PurchaseOrderLine } from "../../domain/purchase-order-line.entity";
import {
  PURCHASE_ORDER_LINE_REPOSITORY,
  PurchaseOrderLineRepository,
} from "../../domain/purchase-order-line.repository";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { PurchaseOrderNotDraftError, PurchaseOrderNotFoundError } from "../errors";
import { ResolvePurchaseLineTargetUseCase } from "./resolve-purchase-line-target.use-case";

export interface AddPurchaseOrderLineInput {
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
  productId: string;
  productVariantId?: string | null;
  warehouseId?: string | null;
  quantity: string;
  unitCost?: string;
}

/** Lines can only be added to a DRAFT order, same rule Sales already established for `SalesOrderLine`/`QuoteLine`. */
@Injectable()
export class AddPurchaseOrderLineUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_LINE_REPOSITORY) private readonly lines: PurchaseOrderLineRepository,
    private readonly resolveTarget: ResolvePurchaseLineTargetUseCase,
  ) {}

  async execute(input: AddPurchaseOrderLineInput): Promise<PurchaseOrderLine> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.status !== "DRAFT") {
      throw new PurchaseOrderNotDraftError();
    }

    const resolved = await this.resolveTarget.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      warehouseId: input.warehouseId,
    });

    const unitCost = input.unitCost ?? resolved.defaultUnitCost ?? "";
    const line = PurchaseOrderLine.create({
      id: newId(),
      tenantId: input.tenantId,
      purchaseOrderId: order.id,
      warehouseId: resolved.warehouseId,
      productId: input.productId,
      productVariantId: resolved.productVariantId,
      quantity: input.quantity,
      unitCost,
      createdAt: new Date(),
    });
    await this.lines.save(line);
    return line;
  }
}
