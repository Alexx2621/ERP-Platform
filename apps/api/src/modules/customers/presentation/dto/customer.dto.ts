import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import type { Customer } from "../../domain/customer.entity";

export class CreateCustomerDto {
  @ApiProperty({ example: "CUST-0001" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Acme Corp" }) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(60) taxId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(255) addressLine?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiProperty({ required: false, example: "GT", description: "ISO 3166-1 alpha-2." })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

/**
 * Every optional field uses the three-state contract: omit to leave the
 * current value unchanged, send "" to clear it, send a real value to
 * replace it — see UpdateCustomerUseCase's docstring.
 */
export class UpdateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(60) taxId?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' })
  @IsOptional()
  @ValidateIf((o: UpdateCustomerDto) => o.email !== "")
  @IsEmail()
  @MaxLength(200)
  email?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(255) addressLine?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(2) country?: string;
}

export class SetCustomerStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class CustomerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) legalName!: string | null;
  @ApiProperty({ type: String, nullable: true }) taxId!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) addressLine!: string | null;
  @ApiProperty({ type: String, nullable: true }) city!: string | null;
  @ApiProperty({ type: String, nullable: true }) country!: string | null;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(customer: Customer): CustomerResponseDto {
    const dto = new CustomerResponseDto();
    dto.id = customer.id;
    dto.code = customer.code;
    dto.name = customer.name;
    dto.legalName = customer.legalName;
    dto.taxId = customer.taxId;
    dto.email = customer.email;
    dto.phone = customer.phone;
    dto.addressLine = customer.addressLine;
    dto.city = customer.city;
    dto.country = customer.country;
    dto.status = customer.status;
    dto.createdAt = customer.createdAt.toISOString();
    dto.updatedAt = customer.updatedAt.toISOString();
    return dto;
  }
}
