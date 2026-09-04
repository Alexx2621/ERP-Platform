import { newId, Prisma, type PrismaClient } from "@erp/database";
import { OutboxMessage } from "../domain/outbox-message.entity";

/**
 * Any Prisma client shape that can run `outboxMessage.create` — either the
 * app's normal `PrismaService` or the `tx` handed to a `$transaction`
 * callback. Producers MUST pass the same `tx` they use for their own state
 * write, never a fresh client — that is what makes the outbox insert
 * atomic with the change it describes (docs/EVENTS.md §5, §8).
 */
export type PrismaClientLike = Pick<PrismaClient, "outboxMessage">;

export interface AppendOutboxMessageInput {
  tenantId: string | null;
  companyId?: string | null;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion?: number | null;
  payload: unknown;
  correlationId: string;
  causationId?: string | null;
  actor: { type: "USER" | "SYSTEM"; id: string | null } | null;
  /**
   * W3C `traceparent`/`tracestate`, typically from `@erp/observability`'s
   * `captureTraceContext()` called at the same point the producer resolves
   * `correlationId` — null when there is no active trace to carry
   * (docs/ARCHITECTURE.md §11).
   */
  traceParent?: string | null;
  traceState?: string | null;
  /** Defaults to now — override only to backdate a message reconstructed from an already-occurred fact. */
  occurredAt?: Date;
}

/**
 * The only function that inserts into `outbox_messages`. Call it with the
 * same transactional client your own repository is already using inside
 * its `$transaction` callback — never as a separate follow-up write after
 * commit, or the atomicity guarantee this table exists for is lost.
 */
export async function appendOutboxMessage(
  client: PrismaClientLike,
  input: AppendOutboxMessageInput,
): Promise<OutboxMessage> {
  const now = new Date();
  const message = OutboxMessage.create({
    id: newId(),
    tenantId: input.tenantId,
    companyId: input.companyId ?? null,
    eventType: input.eventType,
    eventVersion: input.eventVersion,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion ?? null,
    payload: input.payload,
    occurredAt: input.occurredAt ?? now,
    availableAt: now,
    status: "PENDING",
    attemptCount: 0,
    lastErrorCode: null,
    lockedAt: null,
    lockedBy: null,
    publishedAt: null,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    actorType: input.actor?.type ?? null,
    actorId: input.actor?.id ?? null,
    traceParent: input.traceParent ?? null,
    traceState: input.traceState ?? null,
    createdAt: now,
  });

  const props = message.toProps();
  await client.outboxMessage.create({
    data: {
      id: props.id,
      tenantId: props.tenantId,
      companyId: props.companyId,
      eventType: props.eventType,
      eventVersion: props.eventVersion,
      aggregateType: props.aggregateType,
      aggregateId: props.aggregateId,
      aggregateVersion: props.aggregateVersion,
      payload: props.payload as Prisma.InputJsonValue,
      occurredAt: props.occurredAt,
      availableAt: props.availableAt,
      status: props.status,
      attemptCount: props.attemptCount,
      correlationId: props.correlationId,
      causationId: props.causationId,
      actorType: props.actorType,
      actorId: props.actorId,
      traceParent: props.traceParent,
      traceState: props.traceState,
      createdAt: props.createdAt,
    },
  });

  return message;
}
