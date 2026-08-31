import { Inject, Injectable } from "@nestjs/common";
import { Supplier } from "../../domain/supplier.entity";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "../../domain/supplier.repository";

@Injectable()
export class ListSuppliersUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Supplier[]> {
    return this.suppliers.listByCompany(tenantId, companyId);
  }
}
