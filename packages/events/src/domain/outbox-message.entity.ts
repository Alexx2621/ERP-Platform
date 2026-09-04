export type OutboxMessageStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED";
export type EventActorType = "USER" | "SYSTEM";

export interface OutboxMessageProps {
  id: string;
  tenantId: string | null;
  companyId: string | null;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  payload: unknown;
  occurredAt: Date;
  availableAt: Date;
  status: OutboxMessageStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  publishedAt: Date | null;
  correlationId: string;
  causationId: string | null;
  actorType: EventActorType | null;
  actorId: string | null;
  /** W3C `traceparent`/`tracestate`, captured once at append time — see docs/ARCHITECTURE.md §11. */
  traceParent: string | null;
  traceState: string | null;
  createdAt: Date;
}

/** The reconstituted envelope handed to DomainEventBus.publish() — matches docs/EVENTS.md §6. */
export interface IntegrationEventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  tenantId: string | null;
  companyId: string | null;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  correlationId: string;
  causationId: string | null;
  actor: { type: EventActorType; id: string | null } | null;
  payload: unknown;
}

/**
 * Transactional outbox row (docs/EVENTS.md §8). Producers insert one of
 * these in the same database transaction as the state change it describes
 * (see `appendOutboxMessage`); `DispatchOutboxBatchUseCase` is the only
 * thing that transitions its status afterward.
 */
export class OutboxMessage {
  private constructor(private readonly props: OutboxMessageProps) {}

  static create(props: OutboxMessageProps): OutboxMessage {
    const eventType = props.eventType.trim();
    const aggregateType = props.aggregateType.trim();
    if (!eventType) throw new Error("Outbox message eventType is required.");
    if (!aggregateType) throw new Error("Outbox message aggregateType is required.");
    if (!props.aggregateId) throw new Error("Outbox message aggregateId is required.");
    if (!props.correlationId) throw new Error("Outbox message correlationId is required.");
    if (props.companyId && !props.tenantId) {
      throw new Error("An outbox message with a companyId must also carry a tenantId.");
    }
    return new OutboxMessage({ ...props, eventType, aggregateType });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get companyId(): string | null {
    return this.props.companyId;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get status(): OutboxMessageStatus {
    return this.props.status;
  }

  get attemptCount(): number {
    return this.props.attemptCount;
  }

  get payload(): unknown {
    return this.props.payload;
  }

  get correlationId(): string {
    return this.props.correlationId;
  }

  get traceParent(): string | null {
    return this.props.traceParent;
  }

  get traceState(): string | null {
    return this.props.traceState;
  }

  /** Reconstitutes the integration event envelope this row describes, for handing to DomainEventBus. */
  toEnvelope(): IntegrationEventEnvelope {
    return {
      eventId: this.props.id,
      eventType: this.props.eventType,
      eventVersion: this.props.eventVersion,
      occurredAt: this.props.occurredAt,
      tenantId: this.props.tenantId,
      companyId: this.props.companyId,
      aggregateType: this.props.aggregateType,
      aggregateId: this.props.aggregateId,
      aggregateVersion: this.props.aggregateVersion,
      correlationId: this.props.correlationId,
      causationId: this.props.causationId,
      actor:
        this.props.actorType || this.props.actorId
          ? { type: this.props.actorType ?? "SYSTEM", id: this.props.actorId }
          : null,
      payload: this.props.payload,
    };
  }

  /** Only PENDING rows (or PROCESSING rows whose lease expired) are claimable — see the repository's claimBatch query. */
  markProcessing(lockedBy: string, now: Date): void {
    this.props.status = "PROCESSING";
    this.props.lockedAt = now;
    this.props.lockedBy = lockedBy;
  }

  markPublished(now: Date): void {
    this.props.status = "PUBLISHED";
    this.props.publishedAt = now;
    this.props.lockedAt = null;
    this.props.lockedBy = null;
  }

  /**
   * Transitions back to PENDING with an exponential backoff delay unless
   * `maxAttempts` is exceeded, in which case it becomes FAILED (dead-letter,
   * per docs/EVENTS.md §11 — no infinite retry loop).
   */
  markFailed(now: Date, errorCode: string, maxAttempts: number): void {
    this.props.attemptCount += 1;
    this.props.lastErrorCode = errorCode.slice(0, 150);
    this.props.lockedAt = null;
    this.props.lockedBy = null;
    if (this.props.attemptCount >= maxAttempts) {
      this.props.status = "FAILED";
      return;
    }
    this.props.status = "PENDING";
    const backoffSeconds = Math.min(2 ** this.props.attemptCount, 300);
    this.props.availableAt = new Date(now.getTime() + backoffSeconds * 1000);
  }

  toProps(): Readonly<OutboxMessageProps> {
    return { ...this.props };
  }
}
