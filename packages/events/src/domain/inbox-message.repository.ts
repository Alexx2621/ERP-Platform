export const INBOX_MESSAGE_REPOSITORY = Symbol("INBOX_MESSAGE_REPOSITORY");

export interface ClaimInboxMessageOptions {
  /** The consumer's own logical name — the same value must be used for every claim/mark call for that consumer (e.g. "notifications"). */
  consumerName: string;
  /** The event's own id (OutboxMessage.id / IntegrationEventEnvelope.eventId) — identifies the specific delivery being processed. */
  messageId: string;
  tenantId: string | null;
  now: Date;
  /** A PROCESSING row whose lease is older than this becomes reclaimable again (crashed/failed handler recovery), mirroring the outbox's own lease pattern. */
  leaseSeconds: number;
}

export interface InboxMessageRepository {
  /**
   * Atomically claims the right to process this (consumerName, messageId)
   * pair. Returns `true` if this call gets to run the consumer's effect
   * (first time seen, or a stale PROCESSING lease recovered), `false` if
   * another call already completed it or currently holds a live lease.
   */
  tryClaim(options: ClaimInboxMessageOptions): Promise<boolean>;
  markProcessed(consumerName: string, messageId: string, now: Date): Promise<void>;
  /**
   * Records the failure but leaves status PROCESSING (see InboxMessage's own
   * docstring) — the row becomes reclaimable once its lease expires, same
   * recovery path as a crash.
   */
  markFailed(consumerName: string, messageId: string, now: Date, errorCode: string): Promise<void>;
}
