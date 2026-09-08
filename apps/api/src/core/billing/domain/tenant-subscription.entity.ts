export type TenantSubscriptionStatus = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

export interface TenantSubscriptionProps {
  id: string;
  tenantId: string;
  planId: string;
  status: TenantSubscriptionStatus;
  seatCount: number;
  recurrenteCustomerId: string | null;
  recurrenteSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The commercial relationship between the platform and one tenant
 * (docs/DECISIONS.md ADR-016) — one row per tenant, updated in place.
 * `PENDING` is the state a tenant sits in from the moment a checkout
 * session is created until Recurrente's `subscription.create` webhook
 * confirms the first real charge; `ACTIVE`/`PAST_DUE`/`CANCELLED` all
 * mirror real Recurrente subscription states. `seatCount` is tracked for
 * display/manual reconciliation only — Recurrente has no per-seat
 * metering primitive, so it is never used to compute a charge amount
 * (see ADR-016 point 3; never invent billing logic a provider does not
 * itself support, MASTER_SPEC §90).
 */
export class TenantSubscription {
  private constructor(private readonly props: TenantSubscriptionProps) {}

  static create(props: TenantSubscriptionProps): TenantSubscription {
    if (props.seatCount < 1) {
      throw new Error("seatCount must be at least 1.");
    }
    if (props.status === "CANCELLED" && props.cancelledAt === null) {
      throw new Error("A CANCELLED subscription must carry a cancelledAt.");
    }
    return new TenantSubscription({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get planId(): string {
    return this.props.planId;
  }

  get status(): TenantSubscriptionStatus {
    return this.props.status;
  }

  get seatCount(): number {
    return this.props.seatCount;
  }

  get recurrenteCustomerId(): string | null {
    return this.props.recurrenteCustomerId;
  }

  get recurrenteSubscriptionId(): string | null {
    return this.props.recurrenteSubscriptionId;
  }

  get currentPeriodStart(): Date | null {
    return this.props.currentPeriodStart;
  }

  get currentPeriodEnd(): Date | null {
    return this.props.currentPeriodEnd;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Records the real Recurrente Customer created for this tenant, ahead of checkout. Idempotent. */
  attachRecurrenteCustomer(recurrenteCustomerId: string, now: Date): void {
    this.props.recurrenteCustomerId = recurrenteCustomerId;
    this.props.updatedAt = now;
  }

  /** Moves a plan change (manual or self-serve) onto this row before any provider confirmation arrives. */
  assignPlan(planId: string, now: Date): void {
    this.props.planId = planId;
    this.props.updatedAt = now;
  }

  /** A real, manually-assigned or provider-confirmed activation — never invented without one of those two sources. */
  activate(input: { recurrenteSubscriptionId?: string; periodStart?: Date | null; periodEnd?: Date | null }, now: Date): void {
    this.props.status = "ACTIVE";
    if (input.recurrenteSubscriptionId) this.props.recurrenteSubscriptionId = input.recurrenteSubscriptionId;
    if (input.periodStart !== undefined) this.props.currentPeriodStart = input.periodStart;
    if (input.periodEnd !== undefined) this.props.currentPeriodEnd = input.periodEnd;
    this.props.cancelledAt = null;
    this.props.updatedAt = now;
  }

  /** A failed automatic renewal charge. Deliberately changes nothing else — see ADR-016 point 7. */
  markPastDue(now: Date): void {
    this.props.status = "PAST_DUE";
    this.props.updatedAt = now;
  }

  cancel(now: Date): void {
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<TenantSubscriptionProps> {
    return { ...this.props };
  }
}
