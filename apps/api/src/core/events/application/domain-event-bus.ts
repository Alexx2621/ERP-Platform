import { Injectable, Logger } from "@nestjs/common";
import type { IntegrationEventEnvelope } from "../domain/outbox-message.entity";

export type DomainEventHandler = (event: IntegrationEventEnvelope) => Promise<void> | void;

/**
 * In-process publish/subscribe for integration events, invoked by
 * `DispatchOutboxBatchUseCase` after a message is claimed from the outbox
 * (docs/EVENTS.md §3.3/§5) — never called directly by a producer use case,
 * and never invoked before the producer's transaction has committed.
 *
 * V1 scope: purely in-process. There is no cross-process delivery yet (no
 * BullMQ/worker consumer) — that is the future "Workers" backlog item
 * (docs/WORK_QUEUE.md). A handler that throws causes the dispatcher to
 * retry the whole outbox row later (see OutboxMessage.markFailed), so
 * handlers registered here must be safe to run more than once — there is
 * no per-consumer inbox/idempotency table yet (deliberately deferred until
 * a real cross-process consumer needs it — see docs/SECURITY.md "Event Bus").
 */
@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  subscribe(eventType: string, handler: DomainEventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /** Runs every handler registered for this event's type, in registration order. A handler that throws aborts the remaining handlers for this event. */
  async publish(event: IntegrationEventEnvelope): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    if (handlers.length === 0) {
      this.logger.debug(`No handlers registered for ${event.eventType} (eventId=${event.eventId})`);
      return;
    }
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
