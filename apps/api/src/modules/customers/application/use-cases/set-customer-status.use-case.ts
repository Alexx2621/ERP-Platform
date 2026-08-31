import { Inject, Injectable } from "@nestjs/common";
import { Customer, MasterDataStatus } from "../../domain/customer.entity";
import { CUSTOMER_REPOSITORY, CustomerRepository } from "../../domain/customer.repository";
import { CustomerNotFoundError } from "../errors";

export interface SetCustomerStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetCustomerStatusUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(input: SetCustomerStatusInput): Promise<Customer> {
    const customer = await this.customers.findById(input.id);
    if (!customer || customer.tenantId !== input.tenantId || customer.companyId !== input.companyId) {
      throw new CustomerNotFoundError();
    }
    customer.setStatus(input.status);
    await this.customers.save(customer);
    return customer;
  }
}
