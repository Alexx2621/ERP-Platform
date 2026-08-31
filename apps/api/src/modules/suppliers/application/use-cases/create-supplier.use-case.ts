import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Supplier } from "../../domain/supplier.entity";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "../../domain/supplier.repository";
import { SupplierCodeAlreadyInUseError, SupplierTaxIdAlreadyInUseError } from "../errors";

export interface CreateSupplierInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  country?: string;
}

@Injectable()
export class CreateSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository) {}

  async execute(input: CreateSupplierInput): Promise<Supplier> {
    const code = input.code.trim();
    const existingByCode = await this.suppliers.findByCode(input.tenantId, input.companyId, code);
    if (existingByCode) {
      throw new SupplierCodeAlreadyInUseError(code);
    }

    const taxId = input.taxId?.trim() || null;
    if (taxId) {
      const existingByTaxId = await this.suppliers.findByTaxId(input.tenantId, input.companyId, taxId);
      if (existingByTaxId) {
        throw new SupplierTaxIdAlreadyInUseError(taxId);
      }
    }

    const now = new Date();
    const supplier = Supplier.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      legalName: input.legalName?.trim() || null,
      taxId,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.suppliers.save(supplier);
    return supplier;
  }
}
