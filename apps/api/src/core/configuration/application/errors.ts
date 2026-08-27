export class SettingDefinitionNotFoundError extends Error {
  constructor(key: string) {
    super(`Setting "${key}" was not found in the catalog.`);
    this.name = "SettingDefinitionNotFoundError";
  }
}

export class ScopeNotAllowedForSettingError extends Error {
  constructor(
    public readonly key: string,
    public readonly scopeType: string,
  ) {
    super(`Setting "${key}" cannot be set at ${scopeType} scope.`);
    this.name = "ScopeNotAllowedForSettingError";
  }
}

export class InvalidSettingValueError extends Error {
  constructor(key: string, dataType: string) {
    super(`Value for setting "${key}" does not match its declared data type (${dataType}).`);
    this.name = "InvalidSettingValueError";
  }
}

export class CompanyContextRequiredError extends Error {
  constructor() {
    super("A companyId is required to set a COMPANY-scoped value.");
    this.name = "CompanyContextRequiredError";
  }
}

export class CompanyNotFoundInTenantError extends Error {
  constructor() {
    super("The company does not exist in this tenant.");
    this.name = "CompanyNotFoundInTenantError";
  }
}
