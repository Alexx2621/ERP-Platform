export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface WarehouseFields {
  addressLine: string | null;
  city: string | null;
  country: string | null;
}

export interface WarehouseProps extends WarehouseFields {
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

/**
 * Company-scoped master data (MASTER_SPEC Fase 2). Belongs directly to
 * Company — no Branch/Location association, since neither entity exists
 * anywhere in this schema yet (see the schema.prisma docstring on
 * `Warehouse`).
 */
export class Warehouse {
  private constructor(private readonly props: WarehouseProps) {}

  static create(props: WarehouseProps): Warehouse {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Warehouse code is required.");
    if (!name) throw new Error("Warehouse name is required.");
    return new Warehouse({ ...props, code, name });
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

  update(name: string, fields: WarehouseFields): void {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Warehouse name is required.");
    this.props.name = trimmedName;
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

  toProps(): Readonly<WarehouseProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
