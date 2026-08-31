import { assertValidPositiveDecimal } from "./decimal";

export type InventoryReservationStatus = "ACTIVE" | "RELEASED";

export interface InventoryReservationProps {
  id: string;
  tenantId: string;
  companyId: string;
  warehouseId: string;
  productId: string;
  productVariantId: string | null;
  quantity: string;
  status: InventoryReservationStatus;
  referenceType: string | null;
  referenceId: string | null;
  version: number;
  createdAt: Date;
  releasedAt: Date | null;
}

/**
 * Stock earmarked but not physically moved (MASTER_SPEC §20). Never
 * touches `InventoryBalance.onHandQuantity` directly — only
 * `reservedQuantity`, via a RESERVATION movement on creation and a RELEASE
 * movement on release, both posted by `InventoryBalanceRepository.applyMovement`.
 *
 * `referenceType`/`referenceId` are free-form strings, not an enum — unlike
 * `InventoryMovement.referenceType`, which only ever names this module's
 * own internal callers (TRANSFER/RESERVATION/MANUAL). A reservation's
 * reference describes *why* it exists to a caller outside this module
 * (e.g. a future Sales order) — no such module exists yet to constrain
 * against, so the shape is left open rather than guessed at.
 *
 * Only *full* release is supported in this slice — releasing a reservation
 * always frees its entire `quantity`. Partial release (freeing part of a
 * larger reservation while keeping the rest active) would require
 * fulfillment-tracking concepts that belong to the module that actually
 * consumes reservations (Sales, Phase 4), not to Inventory itself.
 */
export class InventoryReservation {
  private constructor(private readonly props: InventoryReservationProps) {}

  static create(props: InventoryReservationProps): InventoryReservation {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new InventoryReservation({ ...props, quantity });
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
  get quantity(): string {
    return this.props.quantity;
  }
  get status(): InventoryReservationStatus {
    return this.props.status;
  }
  get referenceType(): string | null {
    return this.props.referenceType;
  }
  get referenceId(): string | null {
    return this.props.referenceId;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get releasedAt(): Date | null {
    return this.props.releasedAt;
  }

  release(now: Date): void {
    if (this.props.status !== "ACTIVE") {
      throw new Error(`Cannot release a reservation in status ${this.props.status}.`);
    }
    this.props.status = "RELEASED";
    this.props.releasedAt = now;
    this.props.version += 1;
  }

  toProps(): Readonly<InventoryReservationProps> {
    return { ...this.props };
  }
}
