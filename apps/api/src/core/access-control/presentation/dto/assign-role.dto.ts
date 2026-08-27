import { IsIn, IsString, MinLength, ValidateIf } from "class-validator";
import type { RoleAssignmentScope } from "../../domain/role-assignment.entity";

export class AssignRoleDto {
  @IsString()
  @MinLength(1)
  membershipId!: string;

  @IsIn(["TENANT", "COMPANY"])
  scopeType!: RoleAssignmentScope;

  /** Required when scopeType is COMPANY; ignored otherwise (AssignRoleUseCase nulls it out for TENANT). */
  @ValidateIf((dto: AssignRoleDto) => dto.scopeType === "COMPANY")
  @IsString()
  @MinLength(1)
  scopeId?: string;
}
