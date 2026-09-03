export type BillOfMaterialStatus = "ACTIVE" | "INACTIVE";

export interface BillOfMaterialProps {
  id: string;
  tenantId: string;
  companyId: string;
  productId: string;
  code: string;
  name: string;
  version: number;
  status: BillOfMaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A versioned, immutable recipe (docs/ROADMAP.md §14). `version` is
 * assigned by `CreateBillOfMaterialUseCase` — one more than however many
 * BOM rows already exist for the same `productId` — never accepted from a
 * caller. There is no `update()` for components: revising a recipe means
 * creating a brand-new `BillOfMaterial` (and its own components) with the
 * next version number, so any `ProductionOrder` already snapshotted
 * against an older version is never silently affected.
 */
export class BillOfMaterial {
  private constructor(private readonly props: BillOfMaterialProps) {}

  static create(props: BillOfMaterialProps): BillOfMaterial {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Bill of material code is required.");
    if (!name) throw new Error("Bill of material name is required.");
    return new BillOfMaterial({ ...props, code, name });
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
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get version(): number {
    return this.props.version;
  }
  get status(): BillOfMaterialStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  setStatus(status: BillOfMaterialStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  toProps(): Readonly<BillOfMaterialProps> {
    return { ...this.props };
  }
}
