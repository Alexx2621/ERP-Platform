import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrder } from "../../domain/production-order.entity";
import {
  ListProductionOrdersFilter,
  PRODUCTION_ORDER_REPOSITORY,
  ProductionOrderRepository,
} from "../../domain/production-order.repository";

export interface ListProductionOrdersInput {
  tenantId: string;
  companyId: string;
  filter: ListProductionOrdersFilter;
}

@Injectable()
export class ListProductionOrdersUseCase {
  constructor(@Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository) {}

  async execute(input: ListProductionOrdersInput): Promise<ProductionOrder[]> {
    return this.productionOrders.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
