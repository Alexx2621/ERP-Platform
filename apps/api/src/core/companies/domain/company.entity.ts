export type CompanyStatus = "ACTIVE" | "INACTIVE";

export interface CompanyProps {
  id: string;
  tenantId: string;
  organizationId: string;
  code: string;
  name: string;
  status: CompanyStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Legal/accounting or autonomous operating entity inside an Organization. */
export class Company {
  private constructor(private readonly props: CompanyProps) {}

  static create(props: CompanyProps): Company {
    const name = props.name.trim();
    if (!name) throw new Error("Company name is required.");
    if (name.length > 200) throw new Error("Company name cannot exceed 200 characters.");
    if (props.version < 1) throw new Error("Company version must be positive.");
    return new Company({ ...props, name });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): CompanyStatus {
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

  toProps(): Readonly<CompanyProps> {
    return { ...this.props };
  }

  private setStatus(status: CompanyStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
