import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetWarehouseUseCase } from "../../../warehouses";
import { multiplyDecimal } from "../../domain/decimal";
import { ProductionOrder } from "../../domain/production-order.entity";
import { ProductionOrderMaterial } from "../../domain/production-order-material.entity";
import { BILL_OF_MATERIAL_REPOSITORY, BillOfMaterialRepository } from "../../domain/bill-of-material.repository";
import {
  BILL_OF_MATERIAL_COMPONENT_REPOSITORY,
  BillOfMaterialComponentRepository,
} from "../../domain/bill-of-material-component.repository";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_MATERIAL_REPOSITORY,
  ProductionOrderMaterialRepository,
} from "../../domain/production-order-material.repository";
import { BillOfMaterialNotActiveError, BillOfMaterialNotFoundError, WarehouseNotFoundError } from "../errors";

export interface CreateProductionOrderInput {
  tenantId: string;
  companyId: string;
  billOfMaterialId: string;
  warehouseId: string;
  quantityPlanned: string;
}

/**
 * Snapshots `BillOfMaterialComponent` rows into `ProductionOrderMaterial`
 * requirements, scaled by `quantityPlanned` — once, at creation. A later
 * edit or deactivation of the BOM never retroactively changes an
 * already-created order's requirements (see both entities' own
 * docstrings).
 */
@Injectable()
export class CreateProductionOrderUseCase {
  constructor(
    @Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository,
    @Inject(BILL_OF_MATERIAL_COMPONENT_REPOSITORY)
    private readonly bomComponents: BillOfMaterialComponentRepository,
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_REPOSITORY)
    private readonly materials: ProductionOrderMaterialRepository,
    private readonly getWarehouse: GetWarehouseUseCase,
  ) {}

  async execute(input: CreateProductionOrderInput): Promise<ProductionOrder> {
    const billOfMaterial = await this.billsOfMaterial.findById(input.tenantId, input.billOfMaterialId);
    if (!billOfMaterial || billOfMaterial.companyId !== input.companyId) {
      throw new BillOfMaterialNotFoundError();
    }
    if (billOfMaterial.status !== "ACTIVE") {
      throw new BillOfMaterialNotActiveError();
    }

    const warehouse = await this.getWarehouse.execute(input.tenantId, input.warehouseId);
    if (!warehouse || warehouse.companyId !== input.companyId) {
      throw new WarehouseNotFoundError();
    }

    const now = new Date();
    const order = ProductionOrder.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      billOfMaterialId: billOfMaterial.id,
      productId: billOfMaterial.productId,
      warehouseId: warehouse.id,
      quantityPlanned: input.quantityPlanned,
      status: "DRAFT",
      version: 1,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      closedAt: null,
      cancelledAt: null,
    });
    await this.productionOrders.save(order);

    const components = await this.bomComponents.listByBillOfMaterial(input.tenantId, billOfMaterial.id);
    for (const component of components) {
      const material = ProductionOrderMaterial.create({
        id: newId(),
        tenantId: input.tenantId,
        productionOrderId: order.id,
        componentProductId: component.componentProductId,
        componentVariantId: component.componentVariantId,
        quantityRequired: multiplyDecimal(component.quantityPerUnit, order.quantityPlanned),
        createdAt: now,
      });
      await this.materials.save(material);
    }

    return order;
  }
}
