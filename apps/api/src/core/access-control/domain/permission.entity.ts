export interface PermissionProps {
  id: string;
  key: string;
  description: string;
  createdAt: Date;
}

/** Global, code-owned permission definition (docs/MULTITENANCY.md §9.1). Never created from the UI. */
export class Permission {
  private constructor(private readonly props: PermissionProps) {}

  static create(props: PermissionProps): Permission {
    return new Permission(props);
  }

  get id(): string {
    return this.props.id;
  }

  get key(): string {
    return this.props.key;
  }

  get description(): string {
    return this.props.description;
  }

  toProps(): Readonly<PermissionProps> {
    return { ...this.props };
  }
}
