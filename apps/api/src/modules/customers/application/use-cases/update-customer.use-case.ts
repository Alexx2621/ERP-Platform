import { Inject, Injectable } from "@nestjs/common";
import { Customer } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";
import { CustomerNotFoundError, CustomerTaxIdAlreadyInUseError } from "../errors";

export interface UpdateCustomerInput {
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
 * real value → replace. Applied here from the start rather than repeating
 * that bug.
 */
@Injectable()
export class UpdateCustomerUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<Customer> {
    const customer = await this.customers.findById(input.id);
    if (!customer || customer.tenantId !== input.tenantId || customer.companyId !== input.companyId) {
      throw new CustomerNotFoundError();
    }

    const taxId = input.taxId === undefined ? customer.taxId : input.taxId.trim() || null;
    if (taxId && taxId !== customer.taxId) {
      const existingByTaxId = await this.customers.findByTaxId(input.tenantId, input.companyId, taxId);
      if (existingByTaxId) {
        throw new CustomerTaxIdAlreadyInUseError(taxId);
      }
    }

    customer.update(input.name, {
      legalName: input.legalName === undefined ? customer.legalName : input.legalName.trim() || null,
      taxId,
      email: input.email === undefined ? customer.email : input.email.trim().toLowerCase() || null,
      phone: input.phone === undefined ? customer.phone : input.phone.trim() || null,
      addressLine: input.addressLine === undefined ? customer.addressLine : input.addressLine.trim() || null,
      city: input.city === undefined ? customer.city : input.city.trim() || null,
      country: input.country === undefined ? customer.country : input.country.trim() || null,
    });
    await this.customers.save(customer);
    return customer;
  }
}
