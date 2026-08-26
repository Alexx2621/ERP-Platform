import { Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

class OrganizationInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

class CompanyInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class ProvisionTenantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => OrganizationInputDto)
  organization!: OrganizationInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyInputDto)
  company?: CompanyInputDto;
}
