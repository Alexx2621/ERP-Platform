export type StorefrontStatus = "ACTIVE" | "INACTIVE";

export interface StorefrontProps {
  id: string;
  tenantId: string;
  companyId: string;
  defaultWarehouseId: string | null;
  code: string;
  name: string;
  domain: string | null;
  currency: string;
  status: StorefrontStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The multi-storefront unit MASTER_SPEC §23 asks for. `code` is
 * deliberately globally unique, not tenant-scoped — the same precedent
 * `Tenant.slug` already sets: a public storefront handle must be
 * resolvable from an anonymous request with no tenant context of its own
 * (docs/ARCHITECTURE.md §7). `domain` is purely informational metadata —
 * this codebase has no real DNS/multi-tenant hosting wired behind it, the
 * same "not simulated, just not built" honesty already applied to POS's
 * hardware adapters (docs/DECISIONS.md ADR-010).
 */
export class Storefront {
  private constructor(private readonly props: StorefrontProps) {}

  static create(props: StorefrontProps): Storefront {
    const code = props.code.trim().toLowerCase();
    const name = props.name.trim();
    const currency = props.currency.trim().toUpperCase();
    if (!/^[a-z0-9-]{2,63}$/.test(code)) {
      throw new Error("Storefront code must be 2-63 lowercase letters, digits or hyphens.");
    }
    if (!name) {
      throw new Error("Storefront name is required.");
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Storefront currency must be a 3-letter ISO 4217 code.");
    }
    return new Storefront({ ...props, code, name, currency, domain: props.domain?.trim() || null });
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
  get defaultWarehouseId(): string | null {
    return this.props.defaultWarehouseId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get domain(): string | null {
    return this.props.domain;
  }
  get currency(): string {
    return this.props.currency;
  }
  get status(): StorefrontStatus {
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

  setStatus(status: StorefrontStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<StorefrontProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
