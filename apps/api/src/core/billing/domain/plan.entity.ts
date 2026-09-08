const KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;

export interface PlanProps {
  id: string;
  key: string;
  name: string;
  description: string;
  currency: string;
  basePriceAmount: string;
  perUserPriceAmount: string;
  includesAppKeys: readonly string[];
  isSelfServe: boolean;
  recurrenteProductId: string | null;
  recurrentePriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Global, code-owned commercial catalog entry (docs/DECISIONS.md ADR-016) —
 * the exact mirror of AppDefinition, but for what a tenant is *entitled to*
 * (paying for) rather than what it is *technically allowed* to use.
 * Never created from the UI — seeded idempotently by PlanCatalogSeeder from
 * FOUNDATION_PLANS, same pattern as AppDefinition/Permission/SettingDefinition.
 * `recurrenteProductId`/`recurrentePriceId` start null and are attached the
 * first time `PlanCatalogSeeder` provisions the plan as a real Recurrente
 * Product/Price (never fabricated locally — MASTER_SPEC §90).
 */
export class Plan {
  private constructor(private readonly props: PlanProps) {}

  static create(props: PlanProps): Plan {
    if (!KEY_PATTERN.test(props.key)) {
      throw new Error(`Plan key "${props.key}" must be lowercase kebab-case.`);
    }
    if (!/^[A-Z]{3}$/.test(props.currency)) {
      throw new Error(`Plan currency "${props.currency}" must be a 3-letter ISO 4217 code.`);
    }
    if (!DECIMAL_PATTERN.test(props.basePriceAmount)) {
      throw new Error(`Plan basePriceAmount "${props.basePriceAmount}" is not a valid non-negative decimal.`);
    }
    if (!DECIMAL_PATTERN.test(props.perUserPriceAmount)) {
      throw new Error(`Plan perUserPriceAmount "${props.perUserPriceAmount}" is not a valid non-negative decimal.`);
    }
    return new Plan({ ...props, includesAppKeys: [...props.includesAppKeys] });
  }

  get id(): string {
    return this.props.id;
  }

  get key(): string {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get currency(): string {
    return this.props.currency;
  }

  get basePriceAmount(): string {
    return this.props.basePriceAmount;
  }

  get perUserPriceAmount(): string {
    return this.props.perUserPriceAmount;
  }

  get includesAppKeys(): readonly string[] {
    return this.props.includesAppKeys;
  }

  get isSelfServe(): boolean {
    return this.props.isSelfServe;
  }

  get recurrenteProductId(): string | null {
    return this.props.recurrenteProductId;
  }

  get recurrentePriceId(): string | null {
    return this.props.recurrentePriceId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Attaches the real Recurrente Product/Price ids once provisioned. Idempotent to call again with the same ids. */
  attachRecurrenteProduct(productId: string, priceId: string, now: Date): void {
    this.props.recurrenteProductId = productId;
    this.props.recurrentePriceId = priceId;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<PlanProps> {
    return { ...this.props, includesAppKeys: [...this.props.includesAppKeys] };
  }
}
