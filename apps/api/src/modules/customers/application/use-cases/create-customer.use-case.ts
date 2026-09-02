import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Customer } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";
import { CustomerCodeAlreadyInUseError, CustomerTaxIdAlreadyInUseError } from "../errors";

export interface CreateCustomerInput {
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
export class CreateCustomerUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    const code = input.code.trim();
    const existingByCode = await this.customers.findByCode(input.tenantId, input.companyId, code);
    if (existingByCode) {
      throw new CustomerCodeAlreadyInUseError(code);
    }

    const taxId = input.taxId?.trim() || null;
    if (taxId) {
      const existingByTaxId = await this.customers.findByTaxId(input.tenantId, input.companyId, taxId);
      if (existingByTaxId) {
        throw new CustomerTaxIdAlreadyInUseError(taxId);
      }
    }

    const now = new Date();
    const customer = Customer.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      legalName: input.legalName?.trim() || null,
      taxId,
      // Lowercased so email-based lookups (FindCustomerByEmailUseCase, added
      // for Commerce's guest checkout) match regardless of the case a
      // caller originally typed — the same normalization Users already
      // apply via normalizeEmail().
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.customers.save(customer);
    return customer;
  }
}
