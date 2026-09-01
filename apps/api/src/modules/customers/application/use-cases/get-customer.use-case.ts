import { Inject, Injectable } from "@nestjs/common";
import { Customer } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";

/**
 * Cross-module read boundary (docs/ARCHITECTURE.md §6). `CustomerRepository.findById`
 * takes no `tenantId` (an existing, pre-Sales convention of this module —
 * see `UpdateCustomerUseCase`), so the caller must verify
 * `customer.tenantId`/`.companyId` itself, same as every use case inside
 * this module already does.
 */
@Injectable()
export class GetCustomerUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(id: string): Promise<Customer | null> {
    return this.customers.findById(id);
  }
}
