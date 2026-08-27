export type ConfigScopeType = "PLATFORM" | "TENANT" | "COMPANY";
export type SettingDataType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";

export interface SettingDefinitionProps {
  id: string;
  key: string;
  dataType: SettingDataType;
  description: string;
  defaultValue: unknown;
  allowedScopes: ConfigScopeType[];
  createdAt: Date;
}

function matchesDataType(value: unknown, dataType: SettingDataType): boolean {
  switch (dataType) {
    case "STRING":
      return typeof value === "string";
    case "NUMBER":
      return typeof value === "number" && Number.isFinite(value);
    case "BOOLEAN":
      return typeof value === "boolean";
    case "JSON":
      return value !== undefined;
  }
}

/**
 * Global, code-owned configuration catalog entry (docs/ARCHITECTURE.md §8.2,
 * MASTER_SPEC §28). Never created from the UI — seeded idempotently by
 * SettingCatalogSeeder, the same pattern as Permission.
 */
export class SettingDefinition {
  private constructor(private readonly props: SettingDefinitionProps) {}

  static create(props: SettingDefinitionProps): SettingDefinition {
    const key = props.key.trim();
    if (!key) throw new Error("Setting key is required.");
    if (props.allowedScopes.length === 0) {
      throw new Error(`Setting "${key}" must allow at least one scope.`);
    }
    if (!matchesDataType(props.defaultValue, props.dataType)) {
      throw new Error(`Setting "${key}" default value does not match its declared data type.`);
    }
    return new SettingDefinition({ ...props, key, allowedScopes: [...new Set(props.allowedScopes)] });
  }

  get id(): string {
    return this.props.id;
  }

  get key(): string {
    return this.props.key;
  }

  get dataType(): SettingDataType {
    return this.props.dataType;
  }

  get description(): string {
    return this.props.description;
  }

  get defaultValue(): unknown {
    return this.props.defaultValue;
  }

  get allowedScopes(): readonly ConfigScopeType[] {
    return this.props.allowedScopes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  allowsScope(scope: ConfigScopeType): boolean {
    return this.props.allowedScopes.includes(scope);
  }

  /** Throws when `value` does not match this definition's declared data type. */
  assertValidValue(value: unknown): void {
    if (!matchesDataType(value, this.props.dataType)) {
      throw new Error(`Value for setting "${this.props.key}" does not match data type ${this.props.dataType}.`);
    }
  }

  toProps(): Readonly<SettingDefinitionProps> {
    return { ...this.props, allowedScopes: [...this.props.allowedScopes] };
  }
}
