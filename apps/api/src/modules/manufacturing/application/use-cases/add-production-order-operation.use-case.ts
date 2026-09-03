import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { ProductionOrderOperation } from "../../domain/production-order-operation.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_OPERATION_REPOSITORY,
  ProductionOrderOperationRepository,
} from "../../domain/production-order-operation.repository";
import { ProductionOrderNotFoundError, ProductionOrderNotOpenError } from "../errors";

export interface AddProductionOrderOperationInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
  name: string;
}

/** Appended at the end, always — no reorder use case (same "always append" precedent as `PipelineStage.sortOrder`). */
@Injectable()
export class AddProductionOrderOperationUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_OPERATION_REPOSITORY)
    private readonly operations: ProductionOrderOperationRepository,
  ) {}

  async execute(input: AddProductionOrderOperationInput): Promise<ProductionOrderOperation> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new ProductionOrderNotOpenError();
    }

    const existing = await this.operations.listByProductionOrder(input.tenantId, order.id);
    const operation = ProductionOrderOperation.create({
      id: newId(),
      tenantId: input.tenantId,
      productionOrderId: order.id,
      name: input.name,
      sortOrder: existing.length,
      completedAt: null,
      createdAt: new Date(),
    });
    await this.operations.save(operation);
    return operation;
  }
}
