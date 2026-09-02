import { Inject, Injectable } from "@nestjs/common";
import { Customer } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";

/**
 * Added for Commerce's guest checkout (Phase 7): resolves an existing
 * customer by email so a repeat guest buyer doesn't accumulate a new
 * `Customer` row on every order, without giving Commerce direct access to
 * this module's repository (docs/ARCHITECTURE.md §6).
 */
@Injectable()
export class FindCustomerByEmailUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(tenantId: string, companyId: string, email: string): Promise<Customer | null> {
    return this.customers.findByEmail(tenantId, companyId, email.trim().toLowerCase());
  }
}
