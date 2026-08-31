import { assertValidDecimal } from "./decimal";

export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface TaxProps {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  /** Percentage value as a canonical decimal string (e.g. "12.0000" means 12%), never a JS number. */
  rate: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Master-data tax rate lookup (MASTER_SPEC Fase 2) — not a rules engine, see docs/SECURITY.md "Taxes". */
export class Tax {
  private constructor(private readonly props: TaxProps) {}

  static create(props: TaxProps): Tax {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Tax code is required.");
    if (!name) throw new Error("Tax name is required.");
    assertValidDecimal(props.rate, "Tax rate");
    return new Tax({ ...props, code, name });
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
  get rate(): string {
    return this.props.rate;
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

  rename(name: string, rate: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Tax name is required.");
    assertValidDecimal(rate, "Tax rate");
    this.props.name = trimmedName;
    this.props.rate = rate;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<TaxProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
