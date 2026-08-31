export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface CategoryProps {
  id: string;
  tenantId: string;
  companyId: string;
  parentId: string | null;
  code: string;
  name: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Self-referencing tree, company-scoped (MASTER_SPEC Fase 2). */
export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Category {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Category code is required.");
    if (!name) throw new Error("Category name is required.");
    if (props.parentId === props.id) {
      throw new Error("A category cannot be its own parent.");
    }
    return new Category({ ...props, code, name });
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
  get parentId(): string | null {
    return this.props.parentId;
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

  rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");
    this.props.name = trimmed;
    this.bump();
  }

  reparent(parentId: string | null): void {
    if (parentId === this.props.id) {
      throw new Error("A category cannot be its own parent.");
    }
    this.props.parentId = parentId;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<CategoryProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
