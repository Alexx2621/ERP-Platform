import { Module } from "@nestjs/common";
import { OUTBOX_MESSAGE_REPOSITORY } from "./domain/outbox-message.repository";
import { PrismaOutboxMessageRepository } from "./infrastructure/prisma-outbox-message.repository";
import { DomainEventBus } from "./application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "./application/use-cases/dispatch-outbox-batch.use-case";
import { OutboxDispatcherScheduler } from "./application/outbox-dispatcher.scheduler";

/**
 * The consuming app (`apps/worker`) must provide `PRISMA_CLIENT` (see
 * `infrastructure/prisma-client.token`) somewhere globally reachable in its
 * own module graph — typically its own `@Global() PrismaModule`, the same
 * pattern `apps/api` already uses for `PrismaService`/`RedisService`. This
 * module does not provide `PRISMA_CLIENT` itself: a plain function like
 * `appendOutboxMessage` has no such requirement, and the dispatcher side is
 * the only piece that needs a live database connection.
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
export class OutboxDispatcherModule {}
