import { assertValidPositiveDecimal } from "./decimal";

export interface ProductionOrderMaterialProps {
  id: string;
  tenantId: string;
  productionOrderId: string;
  componentProductId: string;
  componentVariantId: string | null;
  quantityRequired: string;
  createdAt: Date;
}

/**
 * A material requirement, snapshotted once from `BillOfMaterialComponent`
 * by `CreateProductionOrderUseCase` (`quantityRequired = quantityPerUnit ×
 * order.quantityPlanned`) — never re-derived from the BOM afterward, so a
 * later BOM revision never silently changes an already-created order's
 * requirements. Carries no "quantityIssued"/"quantityReturned" column —
 * every use case sums real `ProductionOrderMaterialMovement` rows instead
 * (see that entity's own docstring).
 */
export class ProductionOrderMaterial {
  private constructor(private readonly props: ProductionOrderMaterialProps) {}

  static create(props: ProductionOrderMaterialProps): ProductionOrderMaterial {
    const quantityRequired = assertValidPositiveDecimal(props.quantityRequired, "quantityRequired");
    return new ProductionOrderMaterial({ ...props, quantityRequired });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get productionOrderId(): string {
    return this.props.productionOrderId;
  }
  get componentProductId(): string {
    return this.props.componentProductId;
  }
  get componentVariantId(): string | null {
    return this.props.componentVariantId;
  }
  get quantityRequired(): string {
    return this.props.quantityRequired;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<ProductionOrderMaterialProps> {
    return { ...this.props };
  }
}
