import { assertValidPositiveDecimal } from "./decimal";

export type SupplierInvoiceStatus = "RECORDED" | "CANCELLED";

export interface SupplierInvoiceProps {
  id: string;
  tenantId: string;
  companyId: string;
  supplierId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  status: SupplierInvoiceStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

/**
 * A supplier's own invoice, recorded as its own document
 * (docs/ROADMAP.md §9: "Supplier invoices como documento separado") — never
 * a `PurchaseOrder` field. Deliberately **not** connected to any payment
 * capture: this codebase's `Payment` module (Phase 4B) only ever captures
 * money coming *in* against a `SalesOrder`; a real accounts-payable/outgoing
 * payment flow is a distinct, unbuilt capability (MASTER_SPEC §10
 * "cuentas por pagar" — see ADR-009's reasoning for why Payments never
 * fabricated a credential-requiring gateway, the same "don't simulate"
 * principle applies here: `status` only ever tracks whether the invoice
 * itself is a live, recorded document — `RECORDED -> CANCELLED` — not
 * whether it was ever actually paid, since this codebase has no real way
 * to know that yet). `amount` is not validated against the sum of the
 * order's lines or its receipts — a real supplier invoice can legitimately
 * include freight, adjustments, or partial-shipment amounts that don't
 * equal any subset of `PurchaseOrderLine.lineTotal`.
 */
export class SupplierInvoice {
  private constructor(private readonly props: SupplierInvoiceProps) {}

  static create(props: SupplierInvoiceProps): SupplierInvoice {
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Supplier invoice currency must be a 3-letter ISO 4217 code.");
    }
    const invoiceNumber = props.invoiceNumber.trim();
    if (!invoiceNumber) {
      throw new Error("Supplier invoice number is required.");
    }
    if (props.dueDate && props.issueDate.getTime() > props.dueDate.getTime()) {
      throw new Error("Supplier invoice issueDate must not be after dueDate.");
    }
    const amount = assertValidPositiveDecimal(props.amount, "amount");
    return new SupplierInvoice({
      ...props,
      currency,
      invoiceNumber,
      amount,
      notes: props.notes?.trim() || null,
    });
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
  get supplierId(): string {
    return this.props.supplierId;
  }
  get purchaseOrderId(): string {
    return this.props.purchaseOrderId;
  }
  get invoiceNumber(): string {
    return this.props.invoiceNumber;
  }
  get amount(): string {
    return this.props.amount;
  }
  get currency(): string {
    return this.props.currency;
  }
  get issueDate(): Date {
    return this.props.issueDate;
  }
  get dueDate(): Date | null {
    return this.props.dueDate;
  }
  get status(): SupplierInvoiceStatus {
    return this.props.status;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  cancel(now: Date): void {
    if (this.props.status !== "RECORDED") {
      throw new Error(`Cannot cancel a supplier invoice in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<SupplierInvoiceProps> {
    return { ...this.props };
  }
}
