import { subtractDecimal } from "./decimal";

export interface InventoryBalanceProps {
  id: string;
  tenantId: string;
  companyId: string;
  warehouseId: string;
  productId: string;
  productVariantId: string | null;
  onHandQuantity: string;
  reservedQuantity: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A reconciliable projection over the InventoryMovement ledger for one
 * sellable unit (Product or ProductVariant) in one Warehouse — never a
 * second source of truth (MASTER_SPEC §20: "El stock actual debe poder
 * calcularse o mantenerse mediante mecanismos consistentes"). Maintained
 * exclusively by `InventoryBalanceRepository.applyMovement`, inside the
 * same locked transaction that appends the movement row justifying the
 * change; a lost or corrupted row could always be rebuilt by re-summing
 * `inventory_movements`.
 *
 * `availableQuantity = onHandQuantity - reservedQuantity` is always
 * computed here, never persisted as its own column — storing it would
 * create a third value that could drift out of sync with the other two.
 * There is deliberately no `inTransit` field either: it is a query over
 * `InventoryTransfer` rows with `status = IN_TRANSIT` for a warehouse, not
 * a stored balance bucket (see that entity's docstring for why).
 */
export class InventoryBalance {
  private constructor(private readonly props: InventoryBalanceProps) {}

  static create(props: InventoryBalanceProps): InventoryBalance {
    return new InventoryBalance({ ...props });
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
  get onHandQuantity(): string {
    return this.props.onHandQuantity;
  }
  get reservedQuantity(): string {
    return this.props.reservedQuantity;
  }
  get availableQuantity(): string {
    return subtractDecimal(this.props.onHandQuantity, this.props.reservedQuantity);
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

  toProps(): Readonly<InventoryBalanceProps> {
    return { ...this.props };
  }
}
