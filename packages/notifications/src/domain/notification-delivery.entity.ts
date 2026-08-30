export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
export type NotificationDeliveryStatus = "SENT" | "FAILED";

/**
 * Channels `RequestNotificationUseCase` has real dispatch code for. IN_APP
 * always succeeds (persisting the row is the delivery). EMAIL succeeds only
 * when both an `EmailDispatcherPort` is configured (`SmtpEmailDispatcher`,
 * gated by `EMAIL_SMTP_HOST` — apps/worker never configures one today) and
 * the caller supplied `recipientEmail` — otherwise it still produces a
 * `FAILED` row with an explanatory reason, same as SMS/WHATSAPP/PUSH.
 */
export const IMPLEMENTED_NOTIFICATION_CHANNELS: readonly NotificationChannel[] = ["IN_APP", "EMAIL"];

export interface NotificationDeliveryProps {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  sentAt: Date | null;
  readAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
}

/**
 * One delivery attempt per channel requested for a Notification. V1
 * dispatches synchronously (IN_APP delivery = the row's own persistence),
 * so a delivery is always born SENT or FAILED — there is no PENDING state
 * yet (would only be meaningful once an async channel, e.g. Email via a
 * worker, actually exists). EMAIL/SMS/WHATSAPP/PUSH are reserved channel
 * values with no adapter built (`IMPLEMENTED_NOTIFICATION_CHANNELS`) —
 * requesting one produces a FAILED row with an explanatory `failureReason`,
 * not a thrown error, so a caller asking for several channels still gets
 * the ones that do work.
 */
export class NotificationDelivery {
  private constructor(private props: NotificationDeliveryProps) {}

  static create(props: NotificationDeliveryProps): NotificationDelivery {
    if (!props.notificationId) throw new Error("NotificationDelivery notificationId is required.");
    if (props.status === "FAILED" && !props.failureReason) {
      throw new Error("A FAILED delivery must carry a failureReason.");
    }
    return new NotificationDelivery({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get notificationId(): string {
    return this.props.notificationId;
  }

  get channel(): NotificationChannel {
    return this.props.channel;
  }

  get status(): NotificationDeliveryStatus {
    return this.props.status;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  get readAt(): Date | null {
    return this.props.readAt;
  }

  get failureReason(): string | null {
    return this.props.failureReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** No-op (not an error) for an already-read or a never-sent delivery — marking read is idempotent. */
  markRead(now: Date): void {
    if (this.props.status !== "SENT" || this.props.readAt) return;
    this.props.readAt = now;
  }

  toProps(): Readonly<NotificationDeliveryProps> {
    return { ...this.props };
  }
}
