export interface NotificationProps {
  id: string;
  tenantId: string | null;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: Date;
}

/**
 * A notification request (MASTER_SPEC §48). `type` is a code-defined,
 * `<context>.<event>` identifier (e.g. `tenancy.tenant_provisioned`) — not
 * a catalog, same convention as AuditEntry's `action`. Carries no delivery
 * state itself; see NotificationDelivery for per-channel outcome.
 */
export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  static create(props: NotificationProps): Notification {
    const type = props.type.trim();
    const title = props.title.trim();
    const body = props.body.trim();
    if (!type) throw new Error("Notification type is required.");
    if (!title) throw new Error("Notification title is required.");
    if (!body) throw new Error("Notification body is required.");
    if (!props.recipientUserId) throw new Error("Notification recipientUserId is required.");
    return new Notification({ ...props, type, title, body });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get recipientUserId(): string {
    return this.props.recipientUserId;
  }

  get type(): string {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get body(): string {
    return this.props.body;
  }

  get data(): unknown {
    return this.props.data;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<NotificationProps> {
    return { ...this.props };
  }
}
