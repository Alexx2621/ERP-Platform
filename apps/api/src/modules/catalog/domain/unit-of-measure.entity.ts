export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface UnitOfMeasureProps {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  symbol: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Company-scoped master data (MASTER_SPEC Fase 2). */
export class UnitOfMeasure {
  private constructor(private readonly props: UnitOfMeasureProps) {}

  static create(props: UnitOfMeasureProps): UnitOfMeasure {
    const code = props.code.trim();
    const name = props.name.trim();
    const symbol = props.symbol.trim();
    if (!code) throw new Error("Unit of measure code is required.");
    if (!name) throw new Error("Unit of measure name is required.");
    if (!symbol) throw new Error("Unit of measure symbol is required.");
    return new UnitOfMeasure({ ...props, code, name, symbol });
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
  get symbol(): string {
    return this.props.symbol;
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

  rename(name: string, symbol: string): void {
    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim();
    if (!trimmedName) throw new Error("Unit of measure name is required.");
    if (!trimmedSymbol) throw new Error("Unit of measure symbol is required.");
    this.props.name = trimmedName;
    this.props.symbol = trimmedSymbol;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<UnitOfMeasureProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
