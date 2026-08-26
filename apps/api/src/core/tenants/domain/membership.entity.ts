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

  toProps(): Readonly<MembershipProps> {
    return { ...this.props };
  }

  private transitionTo(status: MembershipStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }
}
