import type { PosPaymentMethod } from "./pos-sale.entity";

export interface PosReturnProps {
  id: string;
  tenantId: string;
  companyId: string;
  shiftId: string;
  posSaleId: string;
  salesReturnId: string;
  idempotencyKey: string;
  refunded: boolean;
  refundAmount: string | null;
  refundMethod: PosPaymentMethod | null;
  reason: string | null;
  createdAt: Date;
}

/**
 * The POS-owned record of a completed return — mirrors `PosSale`: created
 * only after the real `SalesReturn` (and, if `refunded`, the real
 * `RefundPaymentUseCase` call against the original sale's `Payment`)
 * succeed. A refund is always the *original* payment's full amount — this
 * codebase has no partial-refund capability yet (docs/DECISIONS.md
 * ADR-009) — so at most one `PosReturn` per `PosSale` can ever set
 * `refunded = true`; a second return against the same sale can still record
 * goods coming back (`refunded = false`) without attempting to refund an
 * already-`REFUNDED` payment.
 */
export class PosReturn {
  private constructor(private readonly props: PosReturnProps) {}

  static create(props: PosReturnProps): PosReturn {
    const idempotencyKey = props.idempotencyKey.trim();
    if (!idempotencyKey) throw new Error("idempotencyKey must not be empty.");
    return new PosReturn({ ...props, idempotencyKey, reason: props.reason?.trim() || null });
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
  get posSaleId(): string {
    return this.props.posSaleId;
  }
  get salesReturnId(): string {
    return this.props.salesReturnId;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get refunded(): boolean {
    return this.props.refunded;
  }
  get refundAmount(): string | null {
    return this.props.refundAmount;
  }
  get refundMethod(): PosPaymentMethod | null {
    return this.props.refundMethod;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PosReturnProps> {
    return { ...this.props };
  }
}
