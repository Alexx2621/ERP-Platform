export interface ProductionOrderOperationProps {
  id: string;
  tenantId: string;
  productionOrderId: string;
  name: string;
  sortOrder: number;
  completedAt: Date | null;
  createdAt: Date;
}

/**
 * A simple named process step (docs/ROADMAP.md §14). Deliberately minimal
 * — no work centers, no routing, no time tracking, just an ordered
 * checklist. Always appended at the end by
 * `AddProductionOrderOperationUseCase` (same "always append, no reorder"
 * precedent as `PipelineStage.sortOrder`); `complete()` is one-way — there
 * is no way to un-complete an operation.
 */
export class ProductionOrderOperation {
  private constructor(private readonly props: ProductionOrderOperationProps) {}

  static create(props: ProductionOrderOperationProps): ProductionOrderOperation {
    const name = props.name.trim();
    if (!name) throw new Error("Operation name is required.");
    return new ProductionOrderOperation({ ...props, name });
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
  get name(): string {
    return this.props.name;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  complete(now: Date): void {
    if (this.props.completedAt) {
      throw new Error("This operation is already completed.");
    }
    this.props.completedAt = now;
  }

  toProps(): Readonly<ProductionOrderOperationProps> {
    return { ...this.props };
  }
}
