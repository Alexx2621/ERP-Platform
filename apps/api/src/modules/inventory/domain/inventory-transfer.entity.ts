import { assertValidPositiveDecimal } from "./decimal";

export type InventoryTransferStatus = "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

export interface InventoryTransferProps {
  id: string;
  tenantId: string;
  companyId: string;
  productId: string;
  productVariantId: string | null;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: string;
  status: InventoryTransferStatus;
  version: number;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

/**
 * Explicit-state movement of stock between two warehouses of the same
 * company (MASTER_SPEC §20, docs/ROADMAP.md §7). Creating a transfer
 * immediately posts a TRANSFER_OUT at the source — stock leaves on-hand
 * right away, not just a "reservation" of intent — so `in_transit` is a
 * query over transfers with `status = IN_TRANSIT` for a warehouse, never a
 * third balance bucket that could drift out of sync with the ledger.
 *
 * `complete()` (stock arrives at destination, posts TRANSFER_IN) and
 * `cancel()` (stock returns to source, posts TRANSFER_CANCELLED) are the
 * only two valid exits from IN_TRANSIT, and both are terminal — a
 * completed or cancelled transfer can never be reopened; correcting one
 * requires a new, separate transfer.
 */
export class InventoryTransfer {
  private constructor(private readonly props: InventoryTransferProps) {}

  static create(props: InventoryTransferProps): InventoryTransfer {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    if (props.sourceWarehouseId === props.destinationWarehouseId) {
      throw new Error("Transfer source and destination warehouses must be different.");
    }
    return new InventoryTransfer({ ...props, quantity });
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
  get productId(): string {
    return this.props.productId;
  }
  get productVariantId(): string | null {
    return this.props.productVariantId;
  }
  get sourceWarehouseId(): string {
    return this.props.sourceWarehouseId;
  }
  get destinationWarehouseId(): string {
    return this.props.destinationWarehouseId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get status(): InventoryTransferStatus {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  complete(now: Date): void {
    if (this.props.status !== "IN_TRANSIT") {
      throw new Error(`Cannot complete a transfer in status ${this.props.status}.`);
    }
    this.props.status = "COMPLETED";
    this.props.completedAt = now;
    this.props.version += 1;
  }

  cancel(now: Date): void {
    if (this.props.status !== "IN_TRANSIT") {
      throw new Error(`Cannot cancel a transfer in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.props.version += 1;
  }

  toProps(): Readonly<InventoryTransferProps> {
    return { ...this.props };
  }
}
