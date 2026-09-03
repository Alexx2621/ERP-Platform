import { assertValidNonNegativeDecimal } from "./decimal";

export type OpportunityStatus = "OPEN" | "WON" | "LOST";

export interface OpportunityProps {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  customerId: string | null;
  leadId: string | null;
  amount: string;
  currency: string;
  expectedCloseDate: Date | null;
  status: OpportunityStatus;
  ownerId: string;
  closedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A deal in progress. `customerId`/`leadId` are both optional and never
 * exclusive — an opportunity can originate from a converted `Lead`
 * (`leadId` set), be opened directly against an existing `Customer`
 * (`customerId` set), or both (a repeat customer's new deal, still linked
 * to whichever lead first brought them in). Neither field is required:
 * an opportunity can exist with just a name while the relationship is
 * still being qualified.
 */
export class Opportunity {
  private constructor(private readonly props: OpportunityProps) {}

  static create(props: OpportunityProps): Opportunity {
    const name = props.name.trim();
    if (!name) throw new Error("Opportunity name is required.");
    const amount = assertValidNonNegativeDecimal(props.amount, "amount");
    return new Opportunity({ ...props, name, amount });
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
  get pipelineId(): string {
    return this.props.pipelineId;
  }
  get stageId(): string {
    return this.props.stageId;
  }
  get customerId(): string | null {
    return this.props.customerId;
  }
  get leadId(): string | null {
    return this.props.leadId;
  }
  get amount(): string {
    return this.props.amount;
  }
  get currency(): string {
    return this.props.currency;
  }
  get expectedCloseDate(): Date | null {
    return this.props.expectedCloseDate;
  }
  get status(): OpportunityStatus {
    return this.props.status;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get closedAt(): Date | null {
    return this.props.closedAt;
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

  update(fields: { name: string; amount: string; expectedCloseDate: Date | null }): void {
    // Validate everything before mutating anything — a failed amount
    // check must never leave a partially-applied name change behind.
    const name = fields.name.trim();
    if (!name) throw new Error("Opportunity name is required.");
    const amount = assertValidNonNegativeDecimal(fields.amount, "amount");
    this.props.name = name;
    this.props.amount = amount;
    this.props.expectedCloseDate = fields.expectedCloseDate;
    this.bump();
  }

  reassignOwner(ownerId: string): void {
    this.props.ownerId = ownerId;
    this.bump();
  }

  /** Moves to any stage of the same pipeline while still `OPEN`; a closed (`WON`/`LOST`) opportunity can never move again — reopening is out of scope for this slice, the same "closed is terminal" philosophy `FiscalPeriod.close()` already established. */
  moveToStage(stageId: string, closingOutcome: "WON" | "LOST" | null, now: Date): void {
    if (this.props.status !== "OPEN") {
      throw new Error(`Cannot move a ${this.props.status} opportunity to a different stage.`);
    }
    this.props.stageId = stageId;
    if (closingOutcome) {
      this.props.status = closingOutcome;
      this.props.closedAt = now;
    }
    this.props.updatedAt = now;
    this.props.version += 1;
  }

  toProps(): Readonly<OpportunityProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
