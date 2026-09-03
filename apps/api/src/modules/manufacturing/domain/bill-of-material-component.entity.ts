import { assertValidPositiveDecimal } from "./decimal";

export interface BillOfMaterialComponentProps {
  id: string;
  tenantId: string;
  billOfMaterialId: string;
  componentProductId: string;
  componentVariantId: string | null;
  quantityPerUnit: string;
  createdAt: Date;
}

/**
 * One required component of a `BillOfMaterial`, created once alongside its
 * parent and never mutated afterward (see `BillOfMaterial`'s own
 * docstring). `quantityPerUnit` is the amount needed to produce exactly
 * one unit of the BOM's own finished good.
 */
export class BillOfMaterialComponent {
  private constructor(private readonly props: BillOfMaterialComponentProps) {}

  static create(props: BillOfMaterialComponentProps): BillOfMaterialComponent {
    const quantityPerUnit = assertValidPositiveDecimal(props.quantityPerUnit, "quantityPerUnit");
    return new BillOfMaterialComponent({ ...props, quantityPerUnit });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get billOfMaterialId(): string {
    return this.props.billOfMaterialId;
  }
  get componentProductId(): string {
    return this.props.componentProductId;
  }
  get componentVariantId(): string | null {
    return this.props.componentVariantId;
  }
  get quantityPerUnit(): string {
    return this.props.quantityPerUnit;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<BillOfMaterialComponentProps> {
    return { ...this.props };
  }
}
