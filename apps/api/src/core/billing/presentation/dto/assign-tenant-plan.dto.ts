import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AssignTenantPlanDto {
  @ApiProperty({ example: "business" })
  @IsString()
  @MinLength(1)
  planKey!: string;
}
