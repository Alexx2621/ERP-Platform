export class AppNotFoundError extends Error {
  constructor(key: string) {
    super(`App "${key}" was not found in the catalog.`);
    this.name = "AppNotFoundError";
  }
}

export class AppDependencyNotSatisfiedError extends Error {
  constructor(public readonly missingKeys: string[]) {
    super(`Missing required, enabled dependencies: ${missingKeys.join(", ")}.`);
    this.name = "AppDependencyNotSatisfiedError";
  }
}

export class AppHasActiveDependentsError extends Error {
  constructor(public readonly dependentKeys: string[]) {
    super(`Cannot disable: still required by enabled app(s): ${dependentKeys.join(", ")}.`);
    this.name = "AppHasActiveDependentsError";
  }
}

export class AppNotEnabledError extends Error {
  constructor(key: string) {
    super(`App "${key}" is not enabled for this tenant.`);
    this.name = "AppNotEnabledError";
  }
}
