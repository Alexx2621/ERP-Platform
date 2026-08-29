export type InboxMessageStatus = "PROCESSING" | "PROCESSED";

export interface InboxMessageProps {
  id: string;
  consumerName: string;
  messageId: string;
  tenantId: string | null;
  status: InboxMessageStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  lockedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
}

/**
 * Consumer-side idempotency record (docs/EVENTS.md §9). Read-mostly wrapper
 * around a row `InboxMessageRepository.tryClaim`/`markProcessed` already
 * mutated atomically in SQL — this entity exists for the same reason
 * `OutboxMessage` does (a typed view of the row for callers that just read
 * it), not to hold claim/recovery logic itself, since that logic requires
 * row-level locking only the repository can provide.
 */
export class InboxMessage {
  private constructor(private readonly props: InboxMessageProps) {}

  static create(props: InboxMessageProps): InboxMessage {
    if (!props.consumerName.trim()) throw new Error("Inbox message consumerName is required.");
    if (!props.messageId) throw new Error("Inbox message messageId is required.");
    return new InboxMessage({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get consumerName(): string {
    return this.props.consumerName;
  }

  get messageId(): string {
    return this.props.messageId;
  }

  get status(): InboxMessageStatus {
    return this.props.status;
  }

  get attemptCount(): number {
    return this.props.attemptCount;
  }

  get lockedAt(): Date {
    return this.props.lockedAt;
  }

  toProps(): Readonly<InboxMessageProps> {
    return { ...this.props };
  }
}
