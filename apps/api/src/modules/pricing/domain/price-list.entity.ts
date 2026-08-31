export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface PriceListFields {
  currency: string;
  validFrom: Date | null;
  validUntil: Date | null;
}

export interface PriceListProps extends PriceListFields {
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
 * A named price scheme with an optional validity window
 * (`docs/ROADMAP.md` §6 item 4, "Pricing/Price Lists con Decimal y
 * vigencia"). Resolving which list applies to a real sale is Sales-phase
 * logic (Phase 4) — this entity only stores the list itself.
 */
export class PriceList {
  private constructor(private readonly props: PriceListProps) {}

  static create(props: PriceListProps): PriceList {
    const code = props.code.trim();
    const name = props.name.trim();
    const currency = props.currency.trim().toUpperCase();
    if (!code) throw new Error("Price list code is required.");
    if (!name) throw new Error("Price list name is required.");
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Price list currency must be a 3-letter ISO 4217 code.");
    }
    if (props.validFrom && props.validUntil && props.validFrom.getTime() > props.validUntil.getTime()) {
      throw new Error("Price list validFrom must not be after validUntil.");
    }
    return new PriceList({ ...props, code, name, currency });
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
  get currency(): string {
    return this.props.currency;
  }
  get validFrom(): Date | null {
    return this.props.validFrom;
  }
  get validUntil(): Date | null {
    return this.props.validUntil;
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

  update(name: string, fields: PriceListFields): void {
    const trimmedName = name.trim();
    const currency = fields.currency.trim().toUpperCase();
    if (!trimmedName) throw new Error("Price list name is required.");
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Price list currency must be a 3-letter ISO 4217 code.");
    }
    if (fields.validFrom && fields.validUntil && fields.validFrom.getTime() > fields.validUntil.getTime()) {
      throw new Error("Price list validFrom must not be after validUntil.");
    }
    this.props.name = trimmedName;
    this.props.currency = currency;
    this.props.validFrom = fields.validFrom;
    this.props.validUntil = fields.validUntil;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<PriceListProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
