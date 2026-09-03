import { assertValidPositiveDecimal } from "./decimal";

export type ProductionOrderStatus = "DRAFT" | "CONFIRMED" | "CLOSED" | "CANCELLED";

export interface ProductionOrderProps {
  id: string;
  tenantId: string;
  companyId: string;
  billOfMaterialId: string;
  productId: string;
  warehouseId: string;
  quantityPlanned: string;
  status: ProductionOrderStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
}

/**
 * `DRAFT -> CONFIRMED -> CLOSED`, with `CANCELLED` reachable only from
 * `DRAFT`/`CONFIRMED` — never from `CLOSED` (mirrors `PurchaseOrder`
 * exactly). Closing does not require every material to be fully consumed
 * or every unit of the finished good received: partial completion is
 * explicit, real-world manufacturing behavior, so `close()` is a
 * deliberate decision the caller makes, not a status the domain derives
 * automatically. `CancelProductionOrderUseCase` additionally rejects
 * cancelling an order that already has at least one real material
 * movement or finished-goods receipt — that invariant needs a cross-table
 * read, so it lives in the use case, not here (docs/ARCHITECTURE.md §6).
 */
export class ProductionOrder {
  private constructor(private readonly props: ProductionOrderProps) {}

  static create(props: ProductionOrderProps): ProductionOrder {
    const quantityPlanned = assertValidPositiveDecimal(props.quantityPlanned, "quantityPlanned");
    return new ProductionOrder({ ...props, quantityPlanned });
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
  get billOfMaterialId(): string {
    return this.props.billOfMaterialId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get warehouseId(): string {
    return this.props.warehouseId;
  }
  get quantityPlanned(): string {
    return this.props.quantityPlanned;
  }
  get status(): ProductionOrderStatus {
    return this.props.status;
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
  get confirmedAt(): Date | null {
    return this.props.confirmedAt;
  }
  get closedAt(): Date | null {
    return this.props.closedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  confirm(now: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new Error(`Cannot confirm a production order in status ${this.props.status}.`);
    }
    this.props.status = "CONFIRMED";
    this.props.confirmedAt = now;
    this.bump();
  }

  close(now: Date): void {
    if (this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot close a production order in status ${this.props.status}.`);
    }
    this.props.status = "CLOSED";
    this.props.closedAt = now;
    this.bump();
  }

  cancel(now: Date): void {
    if (this.props.status !== "DRAFT" && this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot cancel a production order in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.bump();
  }

  toProps(): Readonly<ProductionOrderProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
