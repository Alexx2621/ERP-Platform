import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, Supplier } from "../../domain/supplier.entity";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "../../domain/supplier.repository";
import { SupplierNotFoundError } from "../errors";

export interface SetSupplierStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetSupplierStatusUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository) {}

  async execute(input: SetSupplierStatusInput): Promise<Supplier> {
    const supplier = await this.suppliers.findById(input.id);
    if (!supplier || supplier.tenantId !== input.tenantId || supplier.companyId !== input.companyId) {
      throw new SupplierNotFoundError();
    }
    supplier.setStatus(input.status);
    await this.suppliers.save(supplier);
    return supplier;
  }
}
