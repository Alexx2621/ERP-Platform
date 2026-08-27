export interface AuditEntryProps {
  id: string;
  userId: string | null;
  tenantId: string | null;
  companyId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  previousValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
  createdAt: Date;
}

/**
 * Append-only audit record (MASTER_SPEC §10). `userId` is the actor who
 * performed the action, not necessarily the subject of it — e.g. for a user
 * status change, the subject's id lives in `resourceId`/`newValues`, not
 * `userId`. There is deliberately no update/delete on this entity or its
 * repository — the only supported operation is creating a new entry
 * (docs/ARCHITECTURE.md §8.3: "Outbox y audit no tienen UPDATE/DELETE en el
 * rol normal de aplicación").
 */
export class AuditEntry {
  private constructor(private readonly props: AuditEntryProps) {}

  static create(props: AuditEntryProps): AuditEntry {
    const action = props.action.trim();
    const resource = props.resource.trim();
    if (!action) throw new Error("Audit entry action is required.");
    if (!resource) throw new Error("Audit entry resource is required.");
    return new AuditEntry({ ...props, action, resource });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get companyId(): string | null {
    return this.props.companyId;
  }

  get action(): string {
    return this.props.action;
  }

  get resource(): string {
    return this.props.resource;
  }

  get resourceId(): string | null {
    return this.props.resourceId;
  }

  get previousValues(): unknown {
    return this.props.previousValues;
  }

  get newValues(): unknown {
    return this.props.newValues;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get correlationId(): string {
    return this.props.correlationId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<AuditEntryProps> {
    return { ...this.props };
  }
}
