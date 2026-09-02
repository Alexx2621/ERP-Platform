export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface AccountProps {
  id: string;
  tenantId: string;
  companyId: string;
  parentAccountId: string | null;
  code: string;
  name: string;
  type: AccountType;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const CREDIT_NORMAL_TYPES: ReadonlySet<AccountType> = new Set(["LIABILITY", "EQUITY", "REVENUE"]);

/**
 * A node in the company's Chart of Accounts (MASTER_SPEC §32). `type`
 * determines `normalBalance` deterministically — ASSET/EXPENSE accounts
 * normally carry a debit balance, LIABILITY/EQUITY/REVENUE a credit one —
 * so `normalBalance` is a derived getter, never a stored column that could
 * drift out of sync with `type`. `parentAccountId` is purely organizational
 * in this slice (a tree for display/grouping, e.g. "1000 Assets" ->
 * "1100 Current Assets" -> "1110 Cash"); no automatic balance rollup from
 * children to parents exists yet — the same "storage now, aggregation
 * later if a real need appears" restraint already applied to Catalog's own
 * `Category` tree (docs/SECURITY.md "Accounting" Known limitations).
 */
export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(props: AccountProps): Account {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Account code is required.");
    if (!name) throw new Error("Account name is required.");
    return new Account({ ...props, code, name });
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
  get parentAccountId(): string | null {
    return this.props.parentAccountId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): AccountType {
    return this.props.type;
  }
  get normalBalance(): NormalBalance {
    return CREDIT_NORMAL_TYPES.has(this.props.type) ? "CREDIT" : "DEBIT";
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

  rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Account name is required.");
    this.props.name = trimmed;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<AccountProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
