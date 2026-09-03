import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrderOperation } from "../../domain/production-order-operation.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_OPERATION_REPOSITORY,
  ProductionOrderOperationRepository,
} from "../../domain/production-order-operation.repository";
import { ProductionOrderNotFoundError } from "../errors";

export interface ListProductionOrderOperationsInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

@Injectable()
export class ListProductionOrderOperationsUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_OPERATION_REPOSITORY)
    private readonly operations: ProductionOrderOperationRepository,
  ) {}

  async execute(input: ListProductionOrderOperationsInput): Promise<ProductionOrderOperation[]> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    return this.operations.listByProductionOrder(input.tenantId, order.id);
  }
}
