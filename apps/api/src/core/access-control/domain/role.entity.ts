export interface RoleProps {
  id: string;
  tenantId: string;
  name: string;
  isSystem: boolean;
  /** Permission keys this role grants. Loaded eagerly by the repository so this stays a real aggregate, not a bare row. */
  permissionKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** A tenant-owned, named group of permissions (docs/MULTITENANCY.md §9). */
export class Role {
  private constructor(private readonly props: RoleProps) {}

  static create(props: RoleProps): Role {
    const name = props.name.trim();
    if (!name) throw new Error("Role name is required.");
    if (name.length > 100) throw new Error("Role name cannot exceed 100 characters.");
    return new Role({ ...props, name, permissionKeys: [...new Set(props.permissionKeys)] });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get permissionKeys(): readonly string[] {
    return this.props.permissionKeys;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  hasPermission(key: string): boolean {
    return this.props.permissionKeys.includes(key);
  }

  toProps(): Readonly<RoleProps> {
    return { ...this.props, permissionKeys: [...this.props.permissionKeys] };
  }
}
