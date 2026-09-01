import { Payment } from "../domain/payment.entity";
import { ListPaymentsFilter, PaymentRepository } from "../domain/payment.repository";
import { PaymentIdempotencyConflictError } from "../application/errors";

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly byId = new Map<string, Payment>();

  async findById(tenantId: string, id: string): Promise<Payment | null> {
    const payment = this.byId.get(id);
    return payment && payment.tenantId === tenantId ? payment : null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<Payment | null> {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.companyId === companyId && p.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPaymentsFilter): Promise<Payment[]> {
    return [...this.byId.values()]
      .filter(
        (p) =>
          p.tenantId === tenantId &&
          p.companyId === companyId &&
          (filter.salesOrderId === undefined || p.salesOrderId === filter.salesOrderId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(payment: Payment): Promise<void> {
    if (!this.byId.has(payment.id)) {
      const duplicateKey = await this.findByIdempotencyKey(payment.tenantId, payment.companyId, payment.idempotencyKey);
      if (duplicateKey) {
        throw new PaymentIdempotencyConflictError();
      }
    }
    this.byId.set(payment.id, payment);
  }
}
