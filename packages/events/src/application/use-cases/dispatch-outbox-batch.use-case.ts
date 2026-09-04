import { Inject, Injectable, Logger } from "@nestjs/common";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { restoreTraceContext } from "@erp/observability";
import { OutboxMessage } from "../../domain/outbox-message.entity";
import {
  OUTBOX_MESSAGE_REPOSITORY,
  OutboxMessageRepository,
} from "../../domain/outbox-message.repository";
import { DomainEventBus } from "../domain-event-bus";

const tracer = trace.getTracer("@erp/events");

export interface DispatchOutboxBatchInput {
  limit?: number;
  workerId: string;
}

export interface DispatchOutboxBatchResult {
  claimed: number;
  published: number;
  failed: number;
}

const DEFAULT_BATCH_LIMIT = 20;
const LEASE_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function errorCodeFrom(error: unknown): string {
  if (error instanceof Error) return error.name ? `${error.name}: ${error.message}` : error.message;
  return String(error);
}

/**
 * The outbox dispatcher's single unit of work: claim a batch, hand each
 * message to DomainEventBus, and record the outcome (docs/EVENTS.md §8.2).
 * Runs on an interval from OutboxDispatcherScheduler inside `apps/worker`.
 */
@Injectable()
export class DispatchOutboxBatchUseCase {
  private readonly logger = new Logger(DispatchOutboxBatchUseCase.name);

  constructor(
    @Inject(OUTBOX_MESSAGE_REPOSITORY) private readonly outbox: OutboxMessageRepository,
    private readonly domainEventBus: DomainEventBus,
  ) {}

  async execute(input: DispatchOutboxBatchInput): Promise<DispatchOutboxBatchResult> {
    const claimed = await this.outbox.claimBatch({
      limit: input.limit ?? DEFAULT_BATCH_LIMIT,
      lockedBy: input.workerId,
      now: new Date(),
      leaseSeconds: LEASE_SECONDS,
    });

    let published = 0;
    let failed = 0;
    for (const message of claimed) {
      try {
        await this.publishWithTrace(message);
        message.markPublished(new Date());
        await this.outbox.save(message);
        published++;
      } catch (error) {
        message.markFailed(new Date(), errorCodeFrom(error), MAX_ATTEMPTS);
        await this.outbox.save(message);
        failed++;
        this.logger.error(
          `Failed to dispatch outbox message ${message.id} (${message.eventType}), attempt ${message.attemptCount}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { claimed: claimed.length, published, failed };
  }

  /**
   * Publishes to DomainEventBus as a continuation of the producer's own
   * trace, not an unrelated one — `restoreTraceContext` turns the row's
   * stored `traceParent`/`traceState` (or the current, unrelated context,
   * if the row carries none) into the parent for a new
   * `outbox.dispatch <eventType>` span, and every span the handler itself
   * creates (its own DB queries, downstream calls) nests under it, since
   * it runs inside `context.with(...)` (docs/ARCHITECTURE.md §11: "traces
   * cruzan API, outbox, worker e integración").
   */
  private async publishWithTrace(message: OutboxMessage): Promise<void> {
    const parentContext = restoreTraceContext({
      traceParent: message.traceParent,
      traceState: message.traceState,
    });
    const span = tracer.startSpan(`outbox.dispatch ${message.eventType}`, undefined, parentContext);
    span.setAttribute("app.correlation_id", message.correlationId);
    span.setAttribute("messaging.message.id", message.id);

    try {
      await context.with(trace.setSpan(parentContext, span), () =>
        this.domainEventBus.publish(message.toEnvelope()),
      );
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }
}
