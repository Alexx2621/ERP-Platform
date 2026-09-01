import { assertValidPositiveDecimal } from "./decimal";

export type PosCashMovementType = "CASH_IN" | "CASH_OUT";

export interface PosCashMovementProps {
  id: string;
  tenantId: string;
  companyId: string;
  shiftId: string;
  type: PosCashMovementType;
  amount: string;
  reason: string;
  recordedByUserId: string;
  createdAt: Date;
}

/**
 * Append-only cash-drawer ledger entry — never updated/deleted, the same
 * philosophy as `InventoryMovement`/`AuditEntry`. `reason` is required
 * (never optional) because a movement outside of a sale/return has no
 * other way to explain itself later during a shift-close reconciliation.
 */
export class PosCashMovement {
  private constructor(private readonly props: PosCashMovementProps) {}

  static create(props: PosCashMovementProps): PosCashMovement {
    const amount = assertValidPositiveDecimal(props.amount, "amount");
    const reason = props.reason.trim();
    if (!reason) throw new Error("A cash movement requires a reason.");
    return new PosCashMovement({ ...props, amount, reason });
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
  get shiftId(): string {
    return this.props.shiftId;
  }
  get type(): PosCashMovementType {
    return this.props.type;
  }
  get amount(): string {
    return this.props.amount;
  }
  get reason(): string {
    return this.props.reason;
  }
  get recordedByUserId(): string {
    return this.props.recordedByUserId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PosCashMovementProps> {
    return { ...this.props };
  }
}
