export interface JournalEntryProps {
  id: string;
  tenantId: string;
  companyId: string;
  fiscalPeriodId: string;
  entryDate: Date;
  description: string;
  /** Free-form, e.g. "SALES_ORDER" — deliberately a plain string, not an enum, since no real caller posts one yet; see docs/DECISIONS.md ADR-012. */
  sourceType: string | null;
  sourceId: string | null;
  reversalOfEntryId: string | null;
  reversedByEntryId: string | null;
  reversedAt: Date | null;
  createdByUserId: string;
  correlationId: string;
  createdAt: Date;
}

/**
 * Append-only, the same philosophy as `InventoryMovement`/`AuditEntry` —
 * once created, a `JournalEntry`'s own debit/credit facts (its lines) are
 * never edited or deleted (MASTER_SPEC §32: "No permitir modificar
 * indiscriminadamente movimientos ya contabilizados"). A posting mistake is
 * corrected by creating a brand-new *reversing* entry (same lines, debit
 * and credit swapped) that references this one — never by mutating this
 * one's lines. `reversedByEntryId`/`reversedAt` are the one exception: they
 * are appended once, after the fact, purely as a lifecycle pointer (the
 * same "append metadata about what happened to a fact, never rewrite the
 * fact itself" precedent `Payment.refundedAt`/`FileObject.markDeleted`
 * already established) — the original lines are still exactly what was
 * posted, forever.
 */
export class JournalEntry {
  private constructor(private readonly props: JournalEntryProps) {}

  static create(props: JournalEntryProps): JournalEntry {
    const description = props.description.trim();
    if (!description) throw new Error("Journal entry description is required.");
    return new JournalEntry({ ...props, description });
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
  get fiscalPeriodId(): string {
    return this.props.fiscalPeriodId;
  }
  get entryDate(): Date {
    return this.props.entryDate;
  }
  get description(): string {
    return this.props.description;
  }
  get sourceType(): string | null {
    return this.props.sourceType;
  }
  get sourceId(): string | null {
    return this.props.sourceId;
  }
  get reversalOfEntryId(): string | null {
    return this.props.reversalOfEntryId;
  }
  get reversedByEntryId(): string | null {
    return this.props.reversedByEntryId;
  }
  get reversedAt(): Date | null {
    return this.props.reversedAt;
  }
  get createdByUserId(): string {
    return this.props.createdByUserId;
  }
  get correlationId(): string {
    return this.props.correlationId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isReversed(): boolean {
    return this.props.reversedByEntryId !== null;
  }

  /** Called once, by `ReverseJournalEntryUseCase`, on the *original* entry after the reversing entry has been created and saved. */
  markReversed(reversingEntryId: string, now: Date): void {
    if (this.props.reversedByEntryId !== null) {
      throw new Error("This journal entry has already been reversed.");
    }
    this.props.reversedByEntryId = reversingEntryId;
    this.props.reversedAt = now;
  }

  toProps(): Readonly<JournalEntryProps> {
    return { ...this.props };
  }
}
