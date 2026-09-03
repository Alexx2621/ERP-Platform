import { assertValidPositiveDecimal } from "./decimal";

export type ProductionOrderMaterialMovementType = "ISSUE" | "RETURN";

export interface ProductionOrderMaterialMovementProps {
  id: string;
  tenantId: string;
  productionOrderMaterialId: string;
  type: ProductionOrderMaterialMovementType;
  quantity: string;
  createdAt: Date;
}

/**
 * A real ISSUE (consumption from the warehouse) or RETURN (unused material
 * restored to stock) event against one `ProductionOrderMaterial` —
 * append-only, `quantity` always positive regardless of `type` (the
 * direction is carried by `type`, mirroring `InventoryMovement`'s own
 * typed-ledger shape). Created by `IssueProductionOrderMaterialUseCase`/
 * `ReturnProductionOrderMaterialUseCase` in the same call that posts the
 * matching real Inventory movement — this table is Manufacturing's own
 * read boundary for "how much has been issued/returned so far", validated
 * as a running sum, never a stored counter that could desync (the same
 * pattern `PurchaseReceiptLine`/`SalesReturnLine` already established).
 */
export class ProductionOrderMaterialMovement {
  private constructor(private readonly props: ProductionOrderMaterialMovementProps) {}

  static create(props: ProductionOrderMaterialMovementProps): ProductionOrderMaterialMovement {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new ProductionOrderMaterialMovement({ ...props, quantity });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get productionOrderMaterialId(): string {
    return this.props.productionOrderMaterialId;
  }
  get type(): ProductionOrderMaterialMovementType {
    return this.props.type;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<ProductionOrderMaterialMovementProps> {
    return { ...this.props };
  }
}
