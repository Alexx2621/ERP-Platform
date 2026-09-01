export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface PosRegisterProps {
  id: string;
  tenantId: string;
  companyId: string;
  warehouseId: string;
  code: string;
  name: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A physical/logical POS terminal, always tied to one `Warehouse` — every
 * sale rung up on this register issues stock from that warehouse
 * (`RingUpSaleUseCase` fills `AddSalesOrderLineUseCase.warehouseId` with
 * it, resolved once by `ResolveRegisterTargetUseCase`).
 */
export class PosRegister {
  private constructor(private readonly props: PosRegisterProps) {}

  static create(props: PosRegisterProps): PosRegister {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Register code is required.");
    if (!name) throw new Error("Register name is required.");
    return new PosRegister({ ...props, code, name });
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
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): MasterDataStatus {
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

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<PosRegisterProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
