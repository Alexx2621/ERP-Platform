export type AppKind = "BUSINESS_APP" | "CHANNEL" | "INTEGRATION" | "INDUSTRY_EXTENSION";

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

export interface AppDefinitionProps {
  id: string;
  key: string;
  name: string;
  version: string;
  kind: AppKind;
  dependsOnKeys: readonly string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Global, code-owned catalog entry for an official app/module
 * (docs/PLUGINS.md §3.2, §3.4). Never created from the UI — seeded
 * idempotently by AppCatalogSeeder from FOUNDATION_APPS, same pattern as
 * Permission/SettingDefinition. `PLATFORM`-kind apps do not exist here:
 * Core capabilities are never optional/tenant-activatable (docs/ARCHITECTURE.md
 * §5.3-§5.4), so this catalog only ever holds BUSINESS_APP/CHANNEL/
 * INTEGRATION/INDUSTRY_EXTENSION entries.
 */
export class AppDefinition {
  private constructor(private readonly props: AppDefinitionProps) {}

  static create(props: AppDefinitionProps): AppDefinition {
    if (!KEY_PATTERN.test(props.key)) {
      throw new Error(`App key "${props.key}" must be lowercase kebab-case (docs/PLUGINS.md §4.1).`);
    }
    if (props.dependsOnKeys.includes(props.key)) {
      throw new Error(`App "${props.key}" cannot depend on itself.`);
    }
    return new AppDefinition({ ...props, dependsOnKeys: [...props.dependsOnKeys] });
  }

  get id(): string {
    return this.props.id;
  }

  get key(): string {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get version(): string {
    return this.props.version;
  }

  get kind(): AppKind {
    return this.props.kind;
  }

  get dependsOnKeys(): readonly string[] {
    return this.props.dependsOnKeys;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<AppDefinitionProps> {
    return { ...this.props, dependsOnKeys: [...this.props.dependsOnKeys] };
  }
}
