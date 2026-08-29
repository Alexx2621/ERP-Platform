import type { InboxMessageRepository } from "../domain/inbox-message.repository";

export interface ConsumeIdempotentlyInput {
  consumerName: string;
  messageId: string;
  tenantId: string | null;
  now: Date;
  /** Matches the outbox dispatcher's own default lease (docs/EVENTS.md §8.2) unless a consumer's effect needs longer. */
  leaseSeconds?: number;
}

export type ConsumeIdempotentlyOutcome = "processed" | "duplicate" | "failed";

const DEFAULT_LEASE_SECONDS = 300;

/**
 * The standard shape every DomainEventBus handler with a non-idempotent
 * side effect should follow (docs/EVENTS.md §9, docs/DECISIONS.md ADR-004
 * point 5): claim the (consumerName, messageId) pair before running the
 * effect, skip entirely on a duplicate, and record failure without ever
 * throwing back into the bus (a handler that throws would not stop the
 * dispatcher from marking the outbox row PUBLISHED — publication and
 * consumption are separate concerns, docs/EVENTS.md §5).
 */
export async function consumeIdempotently(
  inbox: InboxMessageRepository,
  input: ConsumeIdempotentlyInput,
  effect: () => Promise<void>,
): Promise<ConsumeIdempotentlyOutcome> {
  const claimed = await inbox.tryClaim({
    consumerName: input.consumerName,
    messageId: input.messageId,
    tenantId: input.tenantId,
    now: input.now,
    leaseSeconds: input.leaseSeconds ?? DEFAULT_LEASE_SECONDS,
  });
  if (!claimed) return "duplicate";

  try {
    await effect();
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : String(error);
    await inbox.markFailed(input.consumerName, input.messageId, input.now, errorCode);
    return "failed";
  }

  await inbox.markProcessed(input.consumerName, input.messageId, input.now);
  return "processed";
}
