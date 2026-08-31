export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface CustomerFields {
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
}

export interface CustomerProps extends CustomerFields {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Company-scoped master data (MASTER_SPEC Fase 2). Kept separate from Supplier — see the schema.prisma docstring on `Customer` for why. */
export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static create(props: CustomerProps): Customer {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Customer code is required.");
    if (!name) throw new Error("Customer name is required.");
    return new Customer({ ...props, code, name });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get companyId(): string {
    return this.props.companyId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get legalName(): string | null {
    return this.props.legalName;
  }
  get taxId(): string | null {
    return this.props.taxId;
  }
  get email(): string | null {
    return this.props.email;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get addressLine(): string | null {
    return this.props.addressLine;
  }
  get city(): string | null {
    return this.props.city;
  }
  get country(): string | null {
    return this.props.country;
  }
  get status(): MasterDataStatus {
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

  update(name: string, fields: CustomerFields): void {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Customer name is required.");
    this.props.name = trimmedName;
    this.props.legalName = fields.legalName;
    this.props.taxId = fields.taxId;
    this.props.email = fields.email;
    this.props.phone = fields.phone;
    this.props.addressLine = fields.addressLine;
    this.props.city = fields.city;
    this.props.country = fields.country;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<CustomerProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
