export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST";

const TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set(["CONVERTED", "LOST"]);

export interface LeadProps {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  ownerId: string;
  consentMarketing: boolean;
  consentedAt: Date | null;
  convertedCustomerId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A prospect not yet a real `Customer` (docs/ROADMAP.md §13 — "Relación
 * explícita con Party/Customers sin duplicar ownership"). `Lead` owns its
 * own contact fields for exactly as long as no `Customer` record exists
 * for it; `ConvertLeadUseCase` is the one moment ownership of "who is
 * this person" formally transfers to the Customers module — after
 * conversion, `convertedCustomerId` is the pointer, and this entity's own
 * `name`/`email`/`phone` become a historical snapshot of the original
 * inquiry, never resynced from the real `Customer` record going forward
 * (the same "don't silently rewrite a snapshotted fact" precedent
 * `SalesOrderLine.unitPrice`/`CommerceOrder.guestEmail` already
 * established).
 */
export class Lead {
  private constructor(private readonly props: LeadProps) {}

  static create(props: LeadProps): Lead {
    const name = props.name.trim();
    if (!name) throw new Error("Lead name is required.");
    return new Lead({ ...props, name });
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
  get name(): string {
    return this.props.name;
  }
  get companyName(): string | null {
    return this.props.companyName;
  }
  get email(): string | null {
    return this.props.email;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get source(): string | null {
    return this.props.source;
  }
  get status(): LeadStatus {
    return this.props.status;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get consentMarketing(): boolean {
    return this.props.consentMarketing;
  }
  get consentedAt(): Date | null {
    return this.props.consentedAt;
  }
  get convertedCustomerId(): string | null {
    return this.props.convertedCustomerId;
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

  get isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.props.status);
  }

  update(fields: { name: string; companyName: string | null; email: string | null; phone: string | null; source: string | null }): void {
    const name = fields.name.trim();
    if (!name) throw new Error("Lead name is required.");
    this.props.name = name;
    this.props.companyName = fields.companyName;
    this.props.email = fields.email;
    this.props.phone = fields.phone;
    this.props.source = fields.source;
    this.bump();
  }

  reassignOwner(ownerId: string): void {
    this.props.ownerId = ownerId;
    this.bump();
  }

  setConsent(consentMarketing: boolean, now: Date): void {
    this.props.consentMarketing = consentMarketing;
    this.props.consentedAt = consentMarketing ? now : null;
    this.bump();
  }

  /** `NEW -> CONTACTED -> QUALIFIED` are freely settable; `CONVERTED`/`LOST` are terminal and only reachable via `markConverted()`/this method's own `LOST` transition — a lead already terminal can never change status again. */
  setStatus(status: LeadStatus): void {
    if (this.isTerminal) {
      throw new Error(`Cannot change status of a ${this.props.status} lead.`);
    }
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  markConverted(customerId: string, now: Date): void {
    if (this.isTerminal) {
      throw new Error(`Cannot convert a ${this.props.status} lead.`);
    }
    this.props.status = "CONVERTED";
    this.props.convertedCustomerId = customerId;
    this.props.updatedAt = now;
    this.props.version += 1;
  }

  toProps(): Readonly<LeadProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
