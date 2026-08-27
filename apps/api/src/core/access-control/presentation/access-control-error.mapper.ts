import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  DuplicateRoleAssignmentError,
  MembershipNotFoundInTenantError,
  PermissionDeniedError,
  RoleNameAlreadyInUseError,
  RoleNotFoundError,
  UnknownPermissionKeysError,
} from "../application/errors";

export function handleAccessControlError(error: unknown): never {
  if (error instanceof RoleNameAlreadyInUseError) {
    throw new AppException("ROLE_NAME_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof UnknownPermissionKeysError) {
    throw new AppException("UNKNOWN_PERMISSION_KEYS", error.message, HttpStatus.BAD_REQUEST, {
      keys: error.keys,
    });
  }
  if (error instanceof RoleNotFoundError) {
    throw new AppException("ROLE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof MembershipNotFoundInTenantError) {
    throw new AppException("MEMBERSHIP_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof DuplicateRoleAssignmentError) {
    throw new AppException("ROLE_ASSIGNMENT_DUPLICATE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PermissionDeniedError) {
    throw new AppException("PERMISSION_DENIED", error.message, HttpStatus.FORBIDDEN);
  }
  throw error;
}
