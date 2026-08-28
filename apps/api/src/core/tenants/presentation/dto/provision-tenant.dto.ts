import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

class OrganizationInputDto {
  @ApiProperty({ minLength: 1, maxLength: 50, example: "HQ" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

class CompanyInputDto {
  @ApiProperty({ minLength: 1, maxLength: 50, example: "CO" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class ProvisionTenantDto {
  @ApiProperty({ minLength: 1, maxLength: 63, example: "acme-inc" })
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  slug!: string;

  @ApiProperty({ minLength: 1, maxLength: 200, example: "Acme Inc." })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: OrganizationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => OrganizationInputDto)
  organization!: OrganizationInputDto;

  @ApiProperty({ type: CompanyInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyInputDto)
  company?: CompanyInputDto;
}
