import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MinLength, ValidateIf } from "class-validator";
import type { RoleAssignmentScope } from "../../domain/role-assignment.entity";

export class AssignRoleDto {
  @ApiProperty({ description: "An existing membership id within the current tenant." })
  @IsString()
  @MinLength(1)
  membershipId!: string;

  @ApiProperty({ enum: ["TENANT", "COMPANY"] })
  @IsIn(["TENANT", "COMPANY"])
  scopeType!: RoleAssignmentScope;

  @ApiProperty({ required: false, description: "Required when scopeType is COMPANY; ignored otherwise." })
  /** Required when scopeType is COMPANY; ignored otherwise (AssignRoleUseCase nulls it out for TENANT). */
  @ValidateIf((dto: AssignRoleDto) => dto.scopeType === "COMPANY")
  @IsString()
  @MinLength(1)
  scopeId?: string;
}
