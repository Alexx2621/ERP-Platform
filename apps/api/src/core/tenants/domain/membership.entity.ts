export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export interface MembershipProps {
  id: string;
  tenantId: string;
  userId: string;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class InvalidMembershipTransitionError extends Error {
  constructor(from: MembershipStatus, to: MembershipStatus) {
    super(`Membership cannot transition from ${from} to ${to}.`);
    this.name = "InvalidMembershipTransitionError";
  }
}

/** Authorization subject linking a global User to exactly one Tenant. */
export class Membership {
  private constructor(private readonly props: MembershipProps) {}

  static create(props: MembershipProps): Membership {
    return new Membership({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get status(): MembershipStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  activate(): void {
    if (this.props.status !== "INVITED" && this.props.status !== "SUSPENDED") {
      throw new InvalidMembershipTransitionError(this.props.status, "ACTIVE");
    }
    this.transitionTo("ACTIVE");
  }

  suspend(): void {
    if (this.props.status !== "ACTIVE") {
      throw new InvalidMembershipTransitionError(this.props.status, "SUSPENDED");
    }
    this.transitionTo("SUSPENDED");
  }

  revoke(): void {
    if (this.props.status === "REVOKED") {
      throw new InvalidMembershipTransitionError(this.props.status, "REVOKED");
    }
    this.transitionTo("REVOKED");
  }

  /**
   * An invitation "expires" without ever changing status — `updatedAt` is
   * the "became INVITED at" timestamp (set by `create`, and refreshed by
   * `reinvite` below), so no separate `expiresAt` column is needed. Only
   * meaningful while still INVITED; anything else is simply not an open
   * invitation to expire.
   */
  isExpiredInvitation(now: Date, ttlSeconds: number): boolean {
    if (this.props.status !== "INVITED") return false;
    return now.getTime() - this.props.updatedAt.getTime() > ttlSeconds * 1000;
  }

  /**
   * Re-opens an invitation that was REVOKED, or one that is still INVITED
   * but past its TTL (a stale invite naturally gives way to a fresh one
   * without requiring an explicit revoke first). Resets the expiry clock by
   * bumping `updatedAt` via `transitionTo`, same as every other transition.
   */
  reinvite(): void {
    if (this.props.status !== "REVOKED" && this.props.status !== "INVITED") {
      throw new InvalidMembershipTransitionError(this.props.status, "INVITED");
    }
    this.transitionTo("INVITED");
  }

  toProps(): Readonly<MembershipProps> {
    return { ...this.props };
  }

  private transitionTo(status: MembershipStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }
}
