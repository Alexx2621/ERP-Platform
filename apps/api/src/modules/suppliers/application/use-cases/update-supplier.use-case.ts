import { Inject, Injectable } from "@nestjs/common";
import { Supplier } from "../../domain/supplier.entity";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "../../domain/supplier.repository";
import { SupplierNotFoundError, SupplierTaxIdAlreadyInUseError } from "../errors";

export interface UpdateSupplierInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  country?: string;
}

/**
 * Every optional field uses the three-state contract established by
 * UpdateProductUseCase (catalog module) after a real data-loss bug was
 * found there: omitted → keep the current value; "" → clear to null; a
 * real value → replace.
 */
@Injectable()
export class UpdateSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository) {}

  async execute(input: UpdateSupplierInput): Promise<Supplier> {
    const supplier = await this.suppliers.findById(input.id);
    if (!supplier || supplier.tenantId !== input.tenantId || supplier.companyId !== input.companyId) {
      throw new SupplierNotFoundError();
    }

    const taxId = input.taxId === undefined ? supplier.taxId : input.taxId.trim() || null;
    if (taxId && taxId !== supplier.taxId) {
      const existingByTaxId = await this.suppliers.findByTaxId(input.tenantId, input.companyId, taxId);
      if (existingByTaxId) {
        throw new SupplierTaxIdAlreadyInUseError(taxId);
      }
    }

    supplier.update(input.name, {
      legalName: input.legalName === undefined ? supplier.legalName : input.legalName.trim() || null,
      taxId,
      email: input.email === undefined ? supplier.email : input.email.trim() || null,
      phone: input.phone === undefined ? supplier.phone : input.phone.trim() || null,
      addressLine: input.addressLine === undefined ? supplier.addressLine : input.addressLine.trim() || null,
      city: input.city === undefined ? supplier.city : input.city.trim() || null,
      country: input.country === undefined ? supplier.country : input.country.trim() || null,
    });
    await this.suppliers.save(supplier);
    return supplier;
  }
}
