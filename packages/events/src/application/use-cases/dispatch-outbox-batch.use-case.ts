import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  OUTBOX_MESSAGE_REPOSITORY,
  OutboxMessageRepository,
} from "../../domain/outbox-message.repository";
import { DomainEventBus } from "../domain-event-bus";

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
        await this.domainEventBus.publish(message.toEnvelope());
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
}
