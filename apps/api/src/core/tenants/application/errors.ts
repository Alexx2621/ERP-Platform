export class TenantSlugAlreadyInUseError extends Error {
  constructor(slug: string) {
    super(`Tenant slug "${slug}" is already in use.`);
    this.name = "TenantSlugAlreadyInUseError";
  }
}

export class ProvisioningUserUnavailableError extends Error {
  constructor(userId: string) {
    super(`User "${userId}" is unavailable for tenant provisioning.`);
    this.name = "ProvisioningUserUnavailableError";
  }
}

export class TenantContextNotFoundError extends Error {
  constructor() {
    super("The requested tenant context was not found.");
    this.name = "TenantContextNotFoundError";
  }
}

export class TenantContextInactiveError extends Error {
  constructor() {
    super("The requested tenant context is inactive.");
    this.name = "TenantContextInactiveError";
  }
}

export class MembershipContextInactiveError extends Error {
  constructor() {
    super("The authenticated user has no active membership in this tenant.");
    this.name = "MembershipContextInactiveError";
  }
}

export class CompanyContextUnavailableError extends Error {
  constructor() {
    super("The requested company is unavailable in this tenant.");
    this.name = "CompanyContextUnavailableError";
  }
}
