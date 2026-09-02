import { assertValidNonNegativeDecimal, isZeroDecimal } from "./decimal";

export interface JournalEntryLineProps {
  id: string;
  tenantId: string;
  journalEntryId: string;
  accountId: string;
  lineNumber: number;
  debit: string;
  credit: string;
  description: string | null;
  createdAt: Date;
}

/**
 * One side of a double-entry posting. The fundamental line-level rule of
 * double-entry bookkeeping is enforced right here, in the domain, not left
 * to the application layer to remember: exactly one of `debit`/`credit` is
 * positive, the other is exactly zero — never both zero (a no-op line) and
 * never both positive (an ambiguous line). The entry-level rule — that all
 * of an entry's lines together balance (`sum(debit) === sum(credit)`) — is
 * necessarily an application-layer check (`CreateJournalEntryUseCase`),
 * since it spans multiple lines at once, the same "line rule in the
 * entity, multi-line rule in the use case" split `SalesOrder`/
 * `ConfirmSalesOrderUseCase` already established.
 */
export class JournalEntryLine {
  private constructor(private readonly props: JournalEntryLineProps) {}

  static create(props: JournalEntryLineProps): JournalEntryLine {
    const debit = assertValidNonNegativeDecimal(props.debit, "debit");
    const credit = assertValidNonNegativeDecimal(props.credit, "credit");
    const debitIsZero = isZeroDecimal(debit);
    const creditIsZero = isZeroDecimal(credit);
    if (debitIsZero === creditIsZero) {
      throw new Error("A journal entry line must have exactly one of debit/credit positive, never both or neither.");
    }
    return new JournalEntryLine({ ...props, debit, credit });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get journalEntryId(): string {
    return this.props.journalEntryId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get lineNumber(): number {
    return this.props.lineNumber;
  }
  get debit(): string {
    return this.props.debit;
  }
  get credit(): string {
    return this.props.credit;
  }
  get description(): string | null {
    return this.props.description;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<JournalEntryLineProps> {
    return { ...this.props };
  }
}
