export type TenantAppStatus = "ENABLED" | "DISABLED";

export interface TenantAppProps {
  id: string;
  tenantId: string;
  appDefinitionId: string;
  status: TenantAppStatus;
  enabledAt: Date;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant-scoped enablement of an AppDefinition (docs/PLUGINS.md §3.5, §7).
 * V1 mínimo collapses the full AVAILABLE/INSTALLING/INSTALLED/ENABLING/
 * DISABLING/SUSPENDED lifecycle down to ENABLED/DISABLED — see
 * docs/DECISIONS.md ADR-005 for why the extra transitional states have no
 * distinct real behavior yet.
 */
export class TenantApp {
  private constructor(private readonly props: TenantAppProps) {}

  static create(props: TenantAppProps): TenantApp {
    if (props.status === "ENABLED" && props.disabledAt !== null) {
      throw new Error("An ENABLED tenant app must not carry a disabledAt.");
    }
    return new TenantApp({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get appDefinitionId(): string {
    return this.props.appDefinitionId;
  }

  get status(): TenantAppStatus {
    return this.props.status;
  }

  get enabledAt(): Date {
    return this.props.enabledAt;
  }

  get disabledAt(): Date | null {
    return this.props.disabledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  enable(now: Date): void {
    this.props.status = "ENABLED";
    this.props.enabledAt = now;
    this.props.disabledAt = null;
    this.props.updatedAt = now;
  }

  disable(now: Date): void {
    this.props.status = "DISABLED";
    this.props.disabledAt = now;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<TenantAppProps> {
    return { ...this.props };
  }
}
