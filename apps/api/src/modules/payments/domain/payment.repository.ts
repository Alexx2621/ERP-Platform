import { Payment } from "./payment.entity";

export interface ListPaymentsFilter {
  salesOrderId?: string;
  limit: number;
}

export interface PaymentRepository {
  findById(tenantId: string, id: string): Promise<Payment | null>;
  findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<Payment | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPaymentsFilter): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol("PAYMENT_REPOSITORY");
