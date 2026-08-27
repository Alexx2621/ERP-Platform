import type { ConfigScopeType } from "./setting-definition.entity";

export interface SettingValueProps {
  id: string;
  definitionId: string;
  scopeType: ConfigScopeType;
  tenantId: string | null;
  companyId: string | null;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A concrete value for a SettingDefinition at exactly one scope instance
 * (docs/MULTITENANCY.md's scope model, applied to configuration rather than
 * RBAC). PLATFORM-scope writes are a deliberate gap in the current HTTP API
 * (see SettingsController's docstring and docs/SECURITY.md) — this entity
 * still models PLATFORM because the domain concept is real even though no
 * endpoint exposes it yet.
 */
export class SettingValue {
  private constructor(private readonly props: SettingValueProps) {}

  static create(props: SettingValueProps): SettingValue {
    if (props.scopeType === "PLATFORM" && (props.tenantId !== null || props.companyId !== null)) {
      throw new Error("A PLATFORM-scoped setting value must not carry a tenantId or companyId.");
    }
    if (props.scopeType === "TENANT" && (props.tenantId === null || props.companyId !== null)) {
      throw new Error("A TENANT-scoped setting value requires a tenantId and must not carry a companyId.");
    }
    if (props.scopeType === "COMPANY" && (props.tenantId === null || props.companyId === null)) {
      throw new Error("A COMPANY-scoped setting value requires both a tenantId and a companyId.");
    }
    return new SettingValue({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get definitionId(): string {
    return this.props.definitionId;
  }

  get scopeType(): ConfigScopeType {
    return this.props.scopeType;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get companyId(): string | null {
    return this.props.companyId;
  }

  get value(): unknown {
    return this.props.value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Denormalized, non-null discriminator the DB unique index relies on — see schema.prisma's comment on SettingValue. */
  get scopeKey(): string {
    switch (this.props.scopeType) {
      case "PLATFORM":
        return "platform";
      case "TENANT":
        return this.props.tenantId as string;
      case "COMPANY":
        return `${this.props.tenantId}:${this.props.companyId}`;
    }
  }

  toProps(): Readonly<SettingValueProps> {
    return { ...this.props };
  }
}
