import { Inject, Injectable } from "@nestjs/common";
import { BillOfMaterial, BillOfMaterialStatus } from "../../domain/bill-of-material.entity";
import { BILL_OF_MATERIAL_REPOSITORY, BillOfMaterialRepository } from "../../domain/bill-of-material.repository";
import { BillOfMaterialNotFoundError } from "../errors";

export interface SetBillOfMaterialStatusInput {
  tenantId: string;
  companyId: string;
  billOfMaterialId: string;
  status: BillOfMaterialStatus;
}

@Injectable()
export class SetBillOfMaterialStatusUseCase {
  constructor(@Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository) {}

  async execute(input: SetBillOfMaterialStatusInput): Promise<BillOfMaterial> {
    const billOfMaterial = await this.billsOfMaterial.findById(input.tenantId, input.billOfMaterialId);
    if (!billOfMaterial || billOfMaterial.companyId !== input.companyId) {
      throw new BillOfMaterialNotFoundError();
    }
    billOfMaterial.setStatus(input.status);
    await this.billsOfMaterial.save(billOfMaterial);
    return billOfMaterial;
  }
}
