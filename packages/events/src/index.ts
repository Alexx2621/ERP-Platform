/** Public contract of the shared Events package. Consuming apps must only import from here. */
export {
  OutboxMessage,
  type OutboxMessageProps,
  type OutboxMessageStatus,
  type EventActorType,
  type IntegrationEventEnvelope,
} from "./domain/outbox-message.entity";
export {
  OUTBOX_MESSAGE_REPOSITORY,
  type OutboxMessageRepository,
  type ClaimOutboxBatchOptions,
} from "./domain/outbox-message.repository";
export {
  appendOutboxMessage,
  type AppendOutboxMessageInput,
  type PrismaClientLike,
} from "./application/append-outbox-message";
export { DomainEventBus, type DomainEventHandler } from "./application/domain-event-bus";
export {
  DispatchOutboxBatchUseCase,
  type DispatchOutboxBatchInput,
  type DispatchOutboxBatchResult,
} from "./application/use-cases/dispatch-outbox-batch.use-case";
export {
  OutboxDispatcherScheduler,
  type OutboxDispatcherEnvironment,
} from "./application/outbox-dispatcher.scheduler";
export {
  PurgePublishedOutboxMessagesUseCase,
  type PurgePublishedOutboxMessagesInput,
  type PurgePublishedOutboxMessagesResult,
} from "./application/use-cases/purge-published-outbox-messages.use-case";
export {
  OutboxPurgeScheduler,
  type OutboxPurgeEnvironment,
} from "./application/outbox-purge.scheduler";
export { PrismaOutboxMessageRepository } from "./infrastructure/prisma-outbox-message.repository";
export { PRISMA_CLIENT } from "./infrastructure/prisma-client.token";
export { OutboxDispatcherModule } from "./outbox-dispatcher.module";
export {
  InboxMessage,
  type InboxMessageProps,
  type InboxMessageStatus,
} from "./domain/inbox-message.entity";
export {
  INBOX_MESSAGE_REPOSITORY,
  type InboxMessageRepository,
  type ClaimInboxMessageOptions,
} from "./domain/inbox-message.repository";
export {
  consumeIdempotently,
  type ConsumeIdempotentlyInput,
  type ConsumeIdempotentlyOutcome,
} from "./application/consume-idempotently";
export { PrismaInboxMessageRepository } from "./infrastructure/prisma-inbox-message.repository";
