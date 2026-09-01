import { Injectable } from "@nestjs/common";
import { GetSupplierUseCase } from "../../../suppliers";
import { SupplierNotFoundError } from "../errors";

/** Verifies a supplier exists and belongs to the active company (docs/ARCHITECTURE.md §6: Purchasing -> public contract of Suppliers). */
@Injectable()
export class ResolveSupplierTargetUseCase {
  constructor(private readonly getSupplier: GetSupplierUseCase) {}

  async execute(tenantId: string, companyId: string, supplierId: string): Promise<void> {
    const supplier = await this.getSupplier.execute(supplierId);
    if (!supplier || supplier.tenantId !== tenantId || supplier.companyId !== companyId) {
      throw new SupplierNotFoundError();
    }
  }
}
