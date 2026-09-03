import { Inject, Injectable } from "@nestjs/common";
import { BillOfMaterial } from "../../domain/bill-of-material.entity";
import {
  BILL_OF_MATERIAL_REPOSITORY,
  BillOfMaterialRepository,
  ListBillOfMaterialsFilter,
} from "../../domain/bill-of-material.repository";

export interface ListBillsOfMaterialInput {
  tenantId: string;
  companyId: string;
  filter: ListBillOfMaterialsFilter;
}

@Injectable()
export class ListBillsOfMaterialUseCase {
  constructor(@Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository) {}

  async execute(input: ListBillsOfMaterialInput): Promise<BillOfMaterial[]> {
    return this.billsOfMaterial.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
