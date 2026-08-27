/**
 * Public contract of the Access Control module. Other modules must only
 * import from here. See access-control.module.ts for why this module has
 * zero dependency on Tenants. RolesController is the HTTP entry point for
 * this domain but is physically homed in tenants/presentation/ (and not
 * exported here) because it also needs TenantContextGuard/CurrentTenantContext
 * — see that file's docstring.
 */
export { Permission, type PermissionProps } from "./domain/permission.entity";
export { Role, type RoleProps } from "./domain/role.entity";
export {
  RoleAssignment,
  type RoleAssignmentProps,
  type RoleAssignmentScope,
} from "./domain/role-assignment.entity";
export { FOUNDATION_PERMISSIONS, type PermissionDefinition } from "./application/permission-catalog";
export { CreateRoleUseCase, type CreateRoleInput } from "./application/use-cases/create-role.use-case";
export { AssignRoleUseCase, type AssignRoleInput } from "./application/use-cases/assign-role.use-case";
export { ListRolesUseCase } from "./application/use-cases/list-roles.use-case";
export { ListPermissionsUseCase } from "./application/use-cases/list-permissions.use-case";
export {
  HasPermissionUseCase,
  type HasPermissionInput,
} from "./application/use-cases/has-permission.use-case";
export {
  SeedOwnerRoleUseCase,
  OWNER_ROLE_NAME,
} from "./application/use-cases/seed-owner-role.use-case";
export {
  RoleNameAlreadyInUseError,
  UnknownPermissionKeysError,
  RoleNotFoundError,
  MembershipNotFoundInTenantError,
  DuplicateRoleAssignmentError,
  PermissionDeniedError,
} from "./application/errors";
export { PermissionGuard } from "./presentation/permission.guard";
export { RequirePermission } from "./presentation/require-permission.decorator";
export { handleAccessControlError } from "./presentation/access-control-error.mapper";
export { CreateRoleDto } from "./presentation/dto/create-role.dto";
export { AssignRoleDto } from "./presentation/dto/assign-role.dto";
export {
  PermissionResponseDto,
  RoleAssignmentResponseDto,
  RoleResponseDto,
} from "./presentation/dto/role-response.dto";
export { AccessControlModule } from "./access-control.module";
