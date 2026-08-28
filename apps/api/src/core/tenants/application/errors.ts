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

export class InvitedUserNotFoundError extends Error {
  constructor() {
    super(
      "No user exists with the given email. Invitations require an existing account " +
        "(MASTER_SPEC §90: no simulated/passwordless account creation).",
    );
    this.name = "InvitedUserNotFoundError";
  }
}

export class InvitedUserDisabledError extends Error {
  constructor() {
    super("The user to invite is disabled and cannot be added to a tenant.");
    this.name = "InvitedUserDisabledError";
  }
}

export class MembershipAlreadyExistsError extends Error {
  constructor() {
    super("A membership already exists for this user in this tenant.");
    this.name = "MembershipAlreadyExistsError";
  }
}

/**
 * Deliberately identical in shape/message to a "not found" — whether the
 * invitation doesn't exist or belongs to a different user is never
 * distinguishable to the caller (same IDOR-resistant pattern already used by
 * Files/Configuration: docs/SECURITY.md).
 */
export class MembershipNotFoundForUserError extends Error {
  constructor() {
    super("No pending invitation was found for the authenticated user.");
    this.name = "MembershipNotFoundForUserError";
  }
}
