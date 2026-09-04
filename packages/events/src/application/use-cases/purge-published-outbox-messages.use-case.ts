import { Inject, Injectable } from "@nestjs/common";
import { OUTBOX_MESSAGE_REPOSITORY, OutboxMessageRepository } from "../../domain/outbox-message.repository";

export interface PurgePublishedOutboxMessagesInput {
  retentionDays: number;
  batchSize: number;
  now?: Date;
}

export interface PurgePublishedOutboxMessagesResult {
  purged: number;
}

/**
 * The retention/purge job docs/EVENTS.md §8.2 has called for since the
 * outbox was first built (ADR-004) but was never implemented — the table
 * grows unbounded otherwise (docs/SECURITY.md "Event Bus", Known
 * limitations). Deletes PUBLISHED rows past the retention window in one
 * bounded batch per call, same "select IDs, then act" shape as
 * `claimBatch`. Deliberately never touches FAILED (dead-letter) rows —
 * those exist specifically for operator investigation
 * (docs/EVENTS.md §11) and have no automatic-recovery mechanism yet, so
 * deleting them automatically would destroy the only record of what went
 * wrong.
 */
@Injectable()
export class PurgePublishedOutboxMessagesUseCase {
  constructor(
    @Inject(OUTBOX_MESSAGE_REPOSITORY) private readonly outbox: OutboxMessageRepository,
  ) {}

  async execute(input: PurgePublishedOutboxMessagesInput): Promise<PurgePublishedOutboxMessagesResult> {
    const now = input.now ?? new Date();
    const cutoff = new Date(now.getTime() - input.retentionDays * 24 * 60 * 60 * 1000);
    const purged = await this.outbox.deletePublishedBefore(cutoff, input.batchSize);
    return { purged };
  }
}
