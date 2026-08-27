import { Module } from "@nestjs/common";
import { OUTBOX_MESSAGE_REPOSITORY } from "./domain/outbox-message.repository";
import { PrismaOutboxMessageRepository } from "./infrastructure/prisma-outbox-message.repository";
import { DomainEventBus } from "./application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "./application/use-cases/dispatch-outbox-batch.use-case";
import { OutboxDispatcherScheduler } from "./application/outbox-dispatcher.scheduler";

/**
 * Deliberately has ZERO dependency on any other core module — same "leaf"
 * shape as AccessControlModule/AuditModule. Every producer module (Tenants
 * today; more as new aggregates emit events) imports EventsModule directly
 * to reach `appendOutboxMessage` (a plain function, not a provider — import
 * it from this module's index.ts, not via DI) and, if it needs to react to
 * events itself, `DomainEventBus.subscribe(...)`.
 */
@Module({
  providers: [
    { provide: OUTBOX_MESSAGE_REPOSITORY, useClass: PrismaOutboxMessageRepository },
    DomainEventBus,
    DispatchOutboxBatchUseCase,
    OutboxDispatcherScheduler,
  ],
  exports: [DomainEventBus, DispatchOutboxBatchUseCase],
})
export class EventsModule {}
