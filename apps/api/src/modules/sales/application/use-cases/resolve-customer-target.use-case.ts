import { Injectable } from "@nestjs/common";
import { GetCustomerUseCase } from "../../../customers";
import { CustomerNotFoundError } from "../errors";

/** Verifies a customer exists and belongs to the active company (docs/ARCHITECTURE.md §6: Sales -> public contract of Customers). */
@Injectable()
export class ResolveCustomerTargetUseCase {
  constructor(private readonly getCustomer: GetCustomerUseCase) {}

  async execute(tenantId: string, companyId: string, customerId: string): Promise<void> {
    const customer = await this.getCustomer.execute(customerId);
    if (!customer || customer.tenantId !== tenantId || customer.companyId !== companyId) {
      throw new CustomerNotFoundError();
    }
  }
}
