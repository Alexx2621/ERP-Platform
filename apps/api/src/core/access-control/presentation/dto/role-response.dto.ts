import type { Role } from "../../domain/role.entity";
import type { Permission } from "../../domain/permission.entity";
import type { RoleAssignment } from "../../domain/role-assignment.entity";

export class RoleResponseDto {
  id!: string;
  name!: string;
  isSystem!: boolean;
  permissionKeys!: string[];

  static fromDomain(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.isSystem = role.isSystem;
    dto.permissionKeys = [...role.permissionKeys];
    return dto;
  }
}

export class PermissionResponseDto {
  key!: string;
  description!: string;

  static fromDomain(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.key = permission.key;
    dto.description = permission.description;
    return dto;
  }
}

export class RoleAssignmentResponseDto {
  id!: string;
  membershipId!: string;
  roleId!: string;
  scopeType!: string;
  scopeId!: string | null;

  static fromDomain(assignment: RoleAssignment): RoleAssignmentResponseDto {
    const dto = new RoleAssignmentResponseDto();
    dto.id = assignment.id;
    dto.membershipId = assignment.membershipId;
    dto.roleId = assignment.roleId;
    dto.scopeType = assignment.scopeType;
    dto.scopeId = assignment.scopeId;
    return dto;
  }
}
