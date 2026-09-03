export type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK";

export interface ActivityProps {
  id: string;
  tenantId: string;
  companyId: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  relatedLeadId: string | null;
  relatedOpportunityId: string | null;
  relatedCustomerId: string | null;
  ownerId: string;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A logged interaction — a call, email, meeting, note, or task. Exactly
 * one of `relatedLeadId`/`relatedOpportunityId`/`relatedCustomerId` must
 * be set: an activity is always about one specific thing, never zero
 * (an orphaned log entry with nothing to show it against) or several at
 * once (which one is it "really" about?). The same line-level "exactly
 * one" domain invariant `JournalEntryLine` already established for
 * debit/credit, applied here to a different kind of exclusivity.
 * `relatedCustomerId` exists specifically so the CRM's own Sales-event
 * consumer (see docs/DECISIONS.md ADR-013) can log an activity straight
 * against a customer with no open lead or opportunity in play.
 */
export class Activity {
  private constructor(private readonly props: ActivityProps) {}

  static create(props: ActivityProps): Activity {
    const subject = props.subject.trim();
    if (!subject) throw new Error("Activity subject is required.");
    const relatedCount = [props.relatedLeadId, props.relatedOpportunityId, props.relatedCustomerId].filter((id) => id !== null).length;
    if (relatedCount !== 1) {
      throw new Error("An activity must relate to exactly one of a lead, an opportunity, or a customer.");
    }
    return new Activity({ ...props, subject });
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
  get type(): ActivityType {
    return this.props.type;
  }
  get subject(): string {
    return this.props.subject;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get relatedLeadId(): string | null {
    return this.props.relatedLeadId;
  }
  get relatedOpportunityId(): string | null {
    return this.props.relatedOpportunityId;
  }
  get relatedCustomerId(): string | null {
    return this.props.relatedCustomerId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get dueAt(): Date | null {
    return this.props.dueAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isCompleted(): boolean {
    return this.props.completedAt !== null;
  }

  complete(now: Date): void {
    if (this.props.completedAt) {
      throw new Error("This activity is already completed.");
    }
    this.props.completedAt = now;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<ActivityProps> {
    return { ...this.props };
  }
}
