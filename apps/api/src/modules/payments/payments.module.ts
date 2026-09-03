import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { AppRegistryModule } from "../../core/app-registry";
import { SalesModule } from "../sales";
import { PAYMENT_REPOSITORY } from "./domain/payment.repository";
import { PrismaPaymentRepository } from "./infrastructure/prisma-payment.repository";
import { PAYMENT_GATEWAYS } from "./application/ports/payment-gateway.port";
import { CashPaymentGatewayAdapter } from "./infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "./infrastructure/bank-transfer-payment-gateway.adapter";
import { CapturePaymentUseCase } from "./application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "./application/use-cases/refund-payment.use-case";
import { ListPaymentsUseCase } from "./application/use-cases/list-payments.use-case";
import { PaymentsController } from "./presentation/payments.controller";

/**
 * Phase 4B — the only module besides Sales itself that depends on Sales'
 * public contract (`GetSalesOrderUseCase`, to validate a `salesOrderId` and
 * read its currency without importing Sales' internal repository,
 * docs/ARCHITECTURE.md §6). No credential-requiring gateway is registered —
 * see `docs/DECISIONS.md`, Payments section, for why `CASH`/
 * `BANK_TRANSFER` are the only two adapters this slice ships.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, SalesModule, AppRegistryModule],
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    CashPaymentGatewayAdapter,
    BankTransferPaymentGatewayAdapter,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (cash: CashPaymentGatewayAdapter, bank: BankTransferPaymentGatewayAdapter) => [cash, bank],
      inject: [CashPaymentGatewayAdapter, BankTransferPaymentGatewayAdapter],
    },
    CapturePaymentUseCase,
    RefundPaymentUseCase,
    ListPaymentsUseCase,
  ],
  exports: [ListPaymentsUseCase, CapturePaymentUseCase, RefundPaymentUseCase],
})
export class PaymentsModule {}
