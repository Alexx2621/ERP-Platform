import { Inject, Injectable } from "@nestjs/common";
import { Payment } from "../../domain/payment.entity";
import { ListPaymentsFilter, PAYMENT_REPOSITORY, PaymentRepository } from "../../domain/payment.repository";

export interface ListPaymentsInput {
  tenantId: string;
  companyId: string;
  filter: ListPaymentsFilter;
}

@Injectable()
export class ListPaymentsUseCase {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository) {}

  async execute(input: ListPaymentsInput): Promise<Payment[]> {
    return this.payments.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
