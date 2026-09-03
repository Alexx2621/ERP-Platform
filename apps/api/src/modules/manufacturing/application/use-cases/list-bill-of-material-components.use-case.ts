import { Inject, Injectable } from "@nestjs/common";
import { BillOfMaterialComponent } from "../../domain/bill-of-material-component.entity";
import { BILL_OF_MATERIAL_REPOSITORY, BillOfMaterialRepository } from "../../domain/bill-of-material.repository";
import {
  BILL_OF_MATERIAL_COMPONENT_REPOSITORY,
  BillOfMaterialComponentRepository,
} from "../../domain/bill-of-material-component.repository";
import { BillOfMaterialNotFoundError } from "../errors";

export interface ListBillOfMaterialComponentsInput {
  tenantId: string;
  companyId: string;
  billOfMaterialId: string;
}

@Injectable()
export class ListBillOfMaterialComponentsUseCase {
  constructor(
    @Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository,
    @Inject(BILL_OF_MATERIAL_COMPONENT_REPOSITORY)
    private readonly components: BillOfMaterialComponentRepository,
  ) {}

  async execute(input: ListBillOfMaterialComponentsInput): Promise<BillOfMaterialComponent[]> {
    const billOfMaterial = await this.billsOfMaterial.findById(input.tenantId, input.billOfMaterialId);
    if (!billOfMaterial || billOfMaterial.companyId !== input.companyId) {
      throw new BillOfMaterialNotFoundError();
    }
    return this.components.listByBillOfMaterial(input.tenantId, input.billOfMaterialId);
  }
}
