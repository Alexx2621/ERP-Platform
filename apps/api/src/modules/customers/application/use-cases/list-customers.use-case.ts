import { Inject, Injectable } from "@nestjs/common";
import { Customer } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";

@Injectable()
export class ListCustomersUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Customer[]> {
    return this.customers.listByCompany(tenantId, companyId);
  }
}
