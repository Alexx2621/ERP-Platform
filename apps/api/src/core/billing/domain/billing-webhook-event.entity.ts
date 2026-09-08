export interface BillingWebhookEventProps {
  id: string;
  providerEventId: string;
  eventType: string;
  payload: unknown;
  processedAt: Date | null;
  createdAt: Date;
}

/**
 * An append-only receipt log of every real Recurrente webhook this platform
 * has verified and accepted (docs/DECISIONS.md ADR-016). `providerEventId`
 * (Svix's `svix-id`) is the real unique-constraint idempotency key — the
 * same "unique-constraint-as-idempotency" pattern `Payment.idempotencyKey`
 * already established, not the `@erp/events` inbox (which exists to
 * consume this platform's own outbox events, not third-party webhooks).
 */
export class BillingWebhookEvent {
  private constructor(private readonly props: BillingWebhookEventProps) {}

  static create(props: BillingWebhookEventProps): BillingWebhookEvent {
    return new BillingWebhookEvent({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get providerEventId(): string {
    return this.props.providerEventId;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get payload(): unknown {
    return this.props.payload;
  }

  get processedAt(): Date | null {
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  markProcessed(now: Date): void {
    this.props.processedAt = now;
  }

  toProps(): Readonly<BillingWebhookEventProps> {
    return { ...this.props };
  }
}
