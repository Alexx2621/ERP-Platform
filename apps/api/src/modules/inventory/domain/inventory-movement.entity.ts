import { assertValidSignedDecimal, isNegativeDecimal } from "./decimal";

export type InventoryMovementType =
  | "RECEIPT"
  | "ISSUE"
  | "ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_CANCELLED"
  | "RESERVATION"
  | "RELEASE"
  | "RETURN";

export type InventoryMovementReferenceType =
  | "TRANSFER"
  | "RESERVATION"
  | "MANUAL"
  | "SALES_ORDER"
  | "SALES_RETURN"
  | "PURCHASE_ORDER"
  | "PURCHASE_RETURN";

export interface InventoryMovementProps {
  id: string;
  tenantId: string;
  companyId: string;
  warehouseId: string;
  productId: string;
  productVariantId: string | null;
  type: InventoryMovementType;
  quantity: string;
  reason: string | null;
  referenceType: InventoryMovementReferenceType | null;
  referenceId: string | null;
  correlationId: string;
  createdByUserId: string;
  createdAt: Date;
}

const POSITIVE_TYPES: ReadonlySet<InventoryMovementType> = new Set([
  "RECEIPT",
  "TRANSFER_IN",
  "TRANSFER_CANCELLED",
  "RESERVATION",
  "RETURN",
]);
const NEGATIVE_TYPES: ReadonlySet<InventoryMovementType> = new Set(["ISSUE", "TRANSFER_OUT", "RELEASE"]);
const ON_HAND_TYPES: ReadonlySet<InventoryMovementType> = new Set([
  "RECEIPT",
  "ISSUE",
  "ADJUSTMENT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "TRANSFER_CANCELLED",
  "RETURN",
]);

/**
 * One append-only row in the inventory ledger (docs/ROADMAP.md §7,
 * MASTER_SPEC §20: "Crear un ledger de movimientos... Nunca permitir que
 * una actualización simple destruya el historial"). Never edited or
 * deleted once created — a transfer cancellation is always corrected by
 * posting a NEW row with the opposite effect (TRANSFER_CANCELLED), never by
 * mutating the original TRANSFER_OUT.
 *
 * `quantity` is a SIGNED decimal string: the balance delta for any row is
 * always exactly its own value, so there is no separate "direction" column
 * that could drift out of sync with `type`. RECEIPT/TRANSFER_IN/
 * TRANSFER_CANCELLED/RESERVATION/RETURN are always positive; ISSUE/
 * TRANSFER_OUT/RELEASE are always negative; ADJUSTMENT may be either sign
 * but requires a
 * non-empty `reason` (MASTER_SPEC §10 — an inventory correction must be
 * explained). These sign/reason invariants are internal — every real use
 * case in this module constructs `type`/`quantity` together itself, never
 * from raw pass-through user input — so a violation here is a defensive
 * "should never happen" backstop (surfaces as a generic 500, same
 * convention as the rest of this module: DTOs validate shape at the
 * boundary, domain enforces business rules), not a reachable user error.
 *
 * RESERVATION/RELEASE never touch physical on-hand stock — see
 * `affectsOnHand`. `InventoryBalanceRepository.applyMovement` is the only
 * writer of `inventory_balances`, and decides which bucket (on-hand vs.
 * reserved) this movement's delta applies to using that flag.
 */
export class InventoryMovement {
  private constructor(private readonly props: InventoryMovementProps) {}

  static create(props: InventoryMovementProps): InventoryMovement {
    const quantity = assertValidSignedDecimal(props.quantity, "quantity");
    const negative = isNegativeDecimal(quantity);

    if (POSITIVE_TYPES.has(props.type) && negative) {
      throw new Error(`${props.type} movements must have a positive quantity.`);
    }
    if (NEGATIVE_TYPES.has(props.type) && !negative) {
      throw new Error(`${props.type} movements must have a negative quantity.`);
    }
    const reason = props.reason?.trim() || null;
    if (props.type === "ADJUSTMENT" && !reason) {
      throw new Error("An adjustment requires a reason.");
    }

    return new InventoryMovement({ ...props, quantity, reason });
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
  get warehouseId(): string {
    return this.props.warehouseId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get productVariantId(): string | null {
    return this.props.productVariantId;
  }
  get type(): InventoryMovementType {
    return this.props.type;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get referenceType(): InventoryMovementReferenceType | null {
    return this.props.referenceType;
  }
  get referenceId(): string | null {
    return this.props.referenceId;
  }
  get correlationId(): string {
    return this.props.correlationId;
  }
  get createdByUserId(): string {
    return this.props.createdByUserId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** True for the six types that move physical on-hand stock; false for RESERVATION/RELEASE, which only move the reserved bucket. */
  get affectsOnHand(): boolean {
    return ON_HAND_TYPES.has(this.props.type);
  }

  toProps(): Readonly<InventoryMovementProps> {
    return { ...this.props };
  }
}
