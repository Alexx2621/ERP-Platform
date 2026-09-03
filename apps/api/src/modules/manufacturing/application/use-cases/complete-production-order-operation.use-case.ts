import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrderOperation } from "../../domain/production-order-operation.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_OPERATION_REPOSITORY,
  ProductionOrderOperationRepository,
} from "../../domain/production-order-operation.repository";
import { ProductionOrderNotFoundError, ProductionOrderOperationNotFoundError } from "../errors";

export interface CompleteProductionOrderOperationInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
  operationId: string;
}

@Injectable()
export class CompleteProductionOrderOperationUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_OPERATION_REPOSITORY)
    private readonly operations: ProductionOrderOperationRepository,
  ) {}

  async execute(input: CompleteProductionOrderOperationInput): Promise<ProductionOrderOperation> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }

    const operation = await this.operations.findById(input.tenantId, input.operationId);
    if (!operation || operation.productionOrderId !== order.id) {
      throw new ProductionOrderOperationNotFoundError();
    }

    operation.complete(new Date());
    await this.operations.save(operation);
    return operation;
  }
}
