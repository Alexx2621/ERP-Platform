import { Inject, Injectable } from "@nestjs/common";
import { Supplier } from "../../domain/supplier.entity";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "../../domain/supplier.repository";

/**
 * Cross-module read boundary (docs/ARCHITECTURE.md §6), same shape as
 * Customers' `GetCustomerUseCase`. `SupplierRepository.findById` takes no
 * `tenantId` (an existing, pre-Purchasing convention of this module), so
 * the caller must verify `supplier.tenantId`/`.companyId` itself.
 */
@Injectable()
export class GetSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository) {}

  async execute(id: string): Promise<Supplier | null> {
    return this.suppliers.findById(id);
  }
}
