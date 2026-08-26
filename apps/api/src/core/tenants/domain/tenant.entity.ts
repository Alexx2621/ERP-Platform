export type TenantStatus = "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "CLOSING" | "CLOSED";

export interface TenantProps {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class InvalidTenantTransitionError extends Error {
  constructor(from: TenantStatus, to: TenantStatus) {
    super(`Tenant cannot transition from ${from} to ${to}.`);
    this.name = "InvalidTenantTransitionError";
  }
}

/** Customer account and primary isolation boundary. */
export class Tenant {
  private constructor(private readonly props: TenantProps) {}

  static create(props: TenantProps): Tenant {
    const name = props.name.trim();
    if (!name) throw new Error("Tenant name is required.");
    if (name.length > 200) throw new Error("Tenant name cannot exceed 200 characters.");
    if (props.version < 1) throw new Error("Tenant version must be positive.");
    return new Tenant({ ...props, name });
  }

  get id(): string {
    return this.props.id;
  }
  get slug(): string {
    return this.props.slug;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): TenantStatus {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
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
    if (this.props.status !== "PROVISIONING" && this.props.status !== "SUSPENDED") {
      throw new InvalidTenantTransitionError(this.props.status, "ACTIVE");
    }
    this.transitionTo("ACTIVE");
  }

  suspend(): void {
    if (this.props.status !== "ACTIVE") {
      throw new InvalidTenantTransitionError(this.props.status, "SUSPENDED");
    }
    this.transitionTo("SUSPENDED");
  }

  beginClosing(): void {
    if (this.props.status !== "ACTIVE" && this.props.status !== "SUSPENDED") {
      throw new InvalidTenantTransitionError(this.props.status, "CLOSING");
    }
    this.transitionTo("CLOSING");
  }

  close(): void {
    if (this.props.status !== "CLOSING") {
      throw new InvalidTenantTransitionError(this.props.status, "CLOSED");
    }
    this.transitionTo("CLOSED");
  }

  toProps(): Readonly<TenantProps> {
    return { ...this.props };
  }

  private transitionTo(status: TenantStatus): void {
    this.props.status = status;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
