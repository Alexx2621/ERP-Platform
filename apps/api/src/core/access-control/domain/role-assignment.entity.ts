export type RoleAssignmentScope = "TENANT" | "COMPANY";

export interface RoleAssignmentProps {
  id: string;
  tenantId: string;
  membershipId: string;
  roleId: string;
  scopeType: RoleAssignmentScope;
  scopeId: string | null;
  createdAt: Date;
}

/**
 * Grants a Role to a Membership within a scope (docs/MULTITENANCY.md §9.2).
 * BRANCH/WAREHOUSE scopes are deferred until those entities exist (see
 * docs/SECURITY.md) — accepting a scopeId with nothing to validate it
 * against would be an unenforced access claim, not a real control.
 */
export class RoleAssignment {
  private constructor(private readonly props: RoleAssignmentProps) {}

  static create(props: RoleAssignmentProps): RoleAssignment {
    if (props.scopeType === "TENANT" && props.scopeId !== null) {
      throw new Error("A TENANT-scoped assignment must not carry a scopeId.");
    }
    if (props.scopeType === "COMPANY" && !props.scopeId) {
      throw new Error("A COMPANY-scoped assignment requires a scopeId.");
    }
    return new RoleAssignment({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get membershipId(): string {
    return this.props.membershipId;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get scopeType(): RoleAssignmentScope {
    return this.props.scopeType;
  }

  get scopeId(): string | null {
    return this.props.scopeId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Does this grant apply to the given request context? Tenant scope always covers; company scope only matches the same company. */
  covers(context: { companyId?: string }): boolean {
    if (this.props.scopeType === "TENANT") return true;
    return this.props.scopeType === "COMPANY" && this.props.scopeId === (context.companyId ?? null);
  }

  toProps(): Readonly<RoleAssignmentProps> {
    return { ...this.props };
  }
}
