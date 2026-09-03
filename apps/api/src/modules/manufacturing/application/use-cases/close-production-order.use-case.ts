import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrder } from "../../domain/production-order.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import { ProductionOrderNotConfirmedError, ProductionOrderNotFoundError } from "../errors";

export interface CloseProductionOrderInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

@Injectable()
export class CloseProductionOrderUseCase {
  constructor(@Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository) {}

  async execute(input: CloseProductionOrderInput): Promise<ProductionOrder> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new ProductionOrderNotConfirmedError();
    }
    order.close(new Date());
    await this.productionOrders.save(order);
    return order;
  }
}
