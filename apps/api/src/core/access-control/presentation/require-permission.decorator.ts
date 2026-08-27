import { SetMetadata } from "@nestjs/common";

export const PERMISSION_METADATA_KEY = "access-control:permission";

/** Declares the permission key PermissionGuard must find in the caller's effective permissions. */
export const RequirePermission = (permissionKey: string) =>
  SetMetadata(PERMISSION_METADATA_KEY, permissionKey);
