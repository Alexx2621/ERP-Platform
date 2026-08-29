import { Module } from "@nestjs/common";
import { OUTBOX_MESSAGE_REPOSITORY } from "./domain/outbox-message.repository";
import { PrismaOutboxMessageRepository } from "./infrastructure/prisma-outbox-message.repository";
import { INBOX_MESSAGE_REPOSITORY } from "./domain/inbox-message.repository";
import { PrismaInboxMessageRepository } from "./infrastructure/prisma-inbox-message.repository";
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
 *
 * `INBOX_MESSAGE_REPOSITORY` is exported here (not bundled into its own
 * module) so any future `DomainEventBus.subscribe` handler registered by a
 * consuming app can inject it directly, alongside `DomainEventBus` itself —
 * the two are used together by construction (docs/EVENTS.md §9).
 */
@Module({
  providers: [
    { provide: OUTBOX_MESSAGE_REPOSITORY, useClass: PrismaOutboxMessageRepository },
    { provide: INBOX_MESSAGE_REPOSITORY, useClass: PrismaInboxMessageRepository },
    DomainEventBus,
    DispatchOutboxBatchUseCase,
    OutboxDispatcherScheduler,
  ],
  exports: [DomainEventBus, DispatchOutboxBatchUseCase, INBOX_MESSAGE_REPOSITORY],
})
export class OutboxDispatcherModule {}
