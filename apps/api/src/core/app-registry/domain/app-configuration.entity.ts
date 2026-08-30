export interface AppConfigurationProps {
  id: string;
  tenantAppId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Opaque per-tenant-app JSON configuration value (docs/PLUGINS.md §11.2).
 * No formal per-key catalog like SettingDefinition yet — no shipped app
 * declares a configurable setting today, so there is nothing real to
 * validate a schema against (docs/DECISIONS.md ADR-005 "Deferred").
 */
export class AppConfiguration {
  private constructor(private readonly props: AppConfigurationProps) {}

  static create(props: AppConfigurationProps): AppConfiguration {
    return new AppConfiguration({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantAppId(): string {
    return this.props.tenantAppId;
  }

  get key(): string {
    return this.props.key;
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

  toProps(): Readonly<AppConfigurationProps> {
    return { ...this.props };
  }
}
