import { Inject, Injectable } from "@nestjs/common";
import { BillOfMaterial } from "../../domain/bill-of-material.entity";
import { BILL_OF_MATERIAL_REPOSITORY, BillOfMaterialRepository } from "../../domain/bill-of-material.repository";
import { BillOfMaterialNotFoundError } from "../errors";

export interface GetBillOfMaterialInput {
  tenantId: string;
  companyId: string;
  billOfMaterialId: string;
}

@Injectable()
export class GetBillOfMaterialUseCase {
  constructor(@Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository) {}

  async execute(input: GetBillOfMaterialInput): Promise<BillOfMaterial> {
    const billOfMaterial = await this.billsOfMaterial.findById(input.tenantId, input.billOfMaterialId);
    if (!billOfMaterial || billOfMaterial.companyId !== input.companyId) {
      throw new BillOfMaterialNotFoundError();
    }
    return billOfMaterial;
  }
}
