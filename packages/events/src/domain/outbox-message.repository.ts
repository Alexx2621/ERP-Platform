import type { OutboxMessage } from "./outbox-message.entity";

export const OUTBOX_MESSAGE_REPOSITORY = Symbol("OUTBOX_MESSAGE_REPOSITORY");

export interface ClaimOutboxBatchOptions {
  /** Max rows to claim in one call. */
  limit: number;
  /** Opaque id of the dispatcher instance claiming the batch — stored in `locked_by` for diagnostics. */
  lockedBy: string;
  now: Date;
  /** A PROCESSING row whose lease is older than this becomes claimable again (crashed dispatcher recovery). */
  leaseSeconds: number;
}

export interface OutboxMessageRepository {
  /**
   * Atomically claims up to `limit` PENDING (or lease-expired PROCESSING)
   * rows and marks them PROCESSING, using row-level locking so two
   * dispatcher instances never claim the same row (docs/EVENTS.md §8.2).
   */
  claimBatch(options: ClaimOutboxBatchOptions): Promise<OutboxMessage[]>;
  save(message: OutboxMessage): Promise<void>;
}
