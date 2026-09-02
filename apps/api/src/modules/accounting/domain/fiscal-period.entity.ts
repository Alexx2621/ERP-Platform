export type FiscalPeriodStatus = "OPEN" | "CLOSED";

export interface FiscalPeriodProps {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: FiscalPeriodStatus;
  closedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `OPEN -> CLOSED`, terminal in this slice — there is deliberately no
 * `ReopenFiscalPeriodUseCase`. `docs/ROADMAP.md` §12's exit criterion
 * ("los períodos cerrados están protegidos") is read literally: once
 * closed, a period can never receive a new posting again, full stop —
 * `CreateJournalEntryUseCase`/`ReverseJournalEntryUseCase` both re-check
 * `status === "OPEN"` themselves rather than trusting a client-supplied
 * claim. Reopening is a real, legitimate need in some accounting
 * workflows, but adding it now — with no permission model or audit
 * requirement yet designed for "undo a closed period" — would be exactly
 * the premature machinery MASTER_SPEC §59/§93 warns against; see
 * docs/SECURITY.md "Accounting" Known limitations.
 */
export class FiscalPeriod {
  private constructor(private readonly props: FiscalPeriodProps) {}

  static create(props: FiscalPeriodProps): FiscalPeriod {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Fiscal period code is required.");
    if (!name) throw new Error("Fiscal period name is required.");
    if (props.startDate.getTime() > props.endDate.getTime()) {
      throw new Error("Fiscal period startDate must not be after endDate.");
    }
    return new FiscalPeriod({ ...props, code, name });
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
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get startDate(): Date {
    return this.props.startDate;
  }
  get endDate(): Date {
    return this.props.endDate;
  }
  get status(): FiscalPeriodStatus {
    return this.props.status;
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

  /** Whether `date` falls within [startDate, endDate], inclusive — the check `GetOpenFiscalPeriodForDateUseCase` uses to resolve which period a posting belongs to. */
  covers(date: Date): boolean {
    return date.getTime() >= this.props.startDate.getTime() && date.getTime() <= this.props.endDate.getTime();
  }

  close(now: Date): void {
    if (this.props.status !== "OPEN") {
      throw new Error(`Cannot close a fiscal period in status ${this.props.status}.`);
    }
    this.props.status = "CLOSED";
    this.props.closedAt = now;
    this.bump();
  }

  toProps(): Readonly<FiscalPeriodProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
