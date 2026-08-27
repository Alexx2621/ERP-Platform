/** Public contract of the Events module. Other modules must only import from here. */
export {
  OutboxMessage,
  type OutboxMessageProps,
  type OutboxMessageStatus,
  type EventActorType,
  type IntegrationEventEnvelope,
} from "./domain/outbox-message.entity";
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
export { EventsModule } from "./events.module";
