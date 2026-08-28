import { ApiProperty } from "@nestjs/swagger";
import type { Role } from "../../domain/role.entity";
import type { Permission } from "../../domain/permission.entity";
import type { RoleAssignment } from "../../domain/role-assignment.entity";

export class RoleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: "True for the auto-seeded Owner role — see MULTITENANCY.md §9." })
  isSystem!: boolean;
  @ApiProperty({ type: [String] }) permissionKeys!: string[];

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
  @ApiProperty({ example: "access.roles.read" }) key!: string;
  @ApiProperty() description!: string;

  static fromDomain(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.key = permission.key;
    dto.description = permission.description;
    return dto;
  }
}

export class RoleAssignmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() membershipId!: string;
  @ApiProperty() roleId!: string;
  @ApiProperty({ enum: ["TENANT", "COMPANY"] }) scopeType!: string;
  @ApiProperty({ nullable: true }) scopeId!: string | null;

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
