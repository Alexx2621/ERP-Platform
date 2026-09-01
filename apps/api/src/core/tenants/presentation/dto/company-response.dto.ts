import { ApiProperty } from "@nestjs/swagger";
import type { Company } from "../../../companies";

export class CompanyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;

  static fromDomain(company: Company): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = company.id;
    dto.code = company.code;
    dto.name = company.name;
    return dto;
  }
}
