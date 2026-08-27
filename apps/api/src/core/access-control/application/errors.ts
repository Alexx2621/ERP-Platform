export class RoleNameAlreadyInUseError extends Error {
  constructor(name: string) {
    super(`A role named "${name}" already exists in this tenant.`);
    this.name = "RoleNameAlreadyInUseError";
  }
}

export class UnknownPermissionKeysError extends Error {
  constructor(public readonly keys: string[]) {
    super(`Unknown permission key(s): ${keys.join(", ")}.`);
    this.name = "UnknownPermissionKeysError";
  }
}

export class RoleNotFoundError extends Error {
  constructor(id: string) {
    super(`Role "${id}" was not found in this tenant.`);
    this.name = "RoleNotFoundError";
  }
}

export class MembershipNotFoundInTenantError extends Error {
  constructor() {
    super("The membership does not exist in this tenant.");
    this.name = "MembershipNotFoundInTenantError";
  }
}

export class DuplicateRoleAssignmentError extends Error {
  constructor() {
    super("This role is already assigned to this membership at this scope.");
    this.name = "DuplicateRoleAssignmentError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(public readonly permissionKey: string) {
    super(`Missing required permission: ${permissionKey}.`);
    this.name = "PermissionDeniedError";
  }
}
