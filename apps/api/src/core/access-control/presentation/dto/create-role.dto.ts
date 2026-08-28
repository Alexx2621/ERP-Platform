import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, ArrayUnique, IsArray, IsString, MaxLength, MinLength } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: "Auditor" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    type: [String],
    description: "Keys from the global permission catalog (GET /permissions).",
    example: ["access.roles.read", "audit.entries.read"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}
