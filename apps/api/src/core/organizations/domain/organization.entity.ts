export type OrganizationStatus = "ACTIVE" | "INACTIVE";

export interface OrganizationProps {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: OrganizationStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Administrative grouping inside a tenant; it is not a legal entity. */
export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(props: OrganizationProps): Organization {
    const name = props.name.trim();
    if (!name) throw new Error("Organization name is required.");
    if (name.length > 200) throw new Error("Organization name cannot exceed 200 characters.");
    if (props.version < 1) throw new Error("Organization version must be positive.");
    return new Organization({ ...props, name });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): OrganizationStatus {
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
    this.setStatus("ACTIVE");
  }
  deactivate(): void {
    this.setStatus("INACTIVE");
  }

  toProps(): Readonly<OrganizationProps> {
    return { ...this.props };
  }

  private setStatus(status: OrganizationStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
