import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from "class-validator";
import type { Lead } from "../../domain/lead.entity";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
const SETTABLE_LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "LOST"] as const;

export class CreateLeadDto {
  @ApiProperty({ example: "Ada Lovelace" }) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(200) companyName?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @ValidateIf((o) => o.email !== "") @IsEmail() email?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(100) source?: string;
  @ApiPropertyOptional({ type: String, description: "Defaults to the caller." }) @IsOptional() @IsUUID() ownerId?: string;
}

export class UpdateLeadDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(200) companyName?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @ValidateIf((o) => o.email !== "") @IsEmail() email?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(100) source?: string;
}

export class SetLeadStatusDto {
  @ApiProperty({ enum: SETTABLE_LEAD_STATUSES }) @IsIn(SETTABLE_LEAD_STATUSES) status!: (typeof SETTABLE_LEAD_STATUSES)[number];
}

export class SetLeadConsentDto {
  @ApiProperty() @IsBoolean() consentMarketing!: boolean;
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ enum: LEAD_STATUSES }) @IsOptional() @IsIn(LEAD_STATUSES) status?: (typeof LEAD_STATUSES)[number];
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() ownerId?: string;
}

export class LeadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) companyName!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) source!: string | null;
  @ApiProperty({ enum: LEAD_STATUSES }) status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() consentMarketing!: boolean;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) consentedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) convertedCustomerId!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(lead: Lead): LeadResponseDto {
    const dto = new LeadResponseDto();
    dto.id = lead.id;
    dto.name = lead.name;
    dto.companyName = lead.companyName;
    dto.email = lead.email;
    dto.phone = lead.phone;
    dto.source = lead.source;
    dto.status = lead.status;
    dto.ownerId = lead.ownerId;
    dto.consentMarketing = lead.consentMarketing;
    dto.consentedAt = lead.consentedAt ? lead.consentedAt.toISOString() : null;
    dto.convertedCustomerId = lead.convertedCustomerId;
    dto.createdAt = lead.createdAt.toISOString();
    dto.updatedAt = lead.updatedAt.toISOString();
    return dto;
  }
}

export class ConvertLeadResponseDto {
  @ApiProperty({ type: LeadResponseDto }) lead!: LeadResponseDto;
  @ApiProperty() customerId!: string;
  @ApiProperty() wasExistingCustomer!: boolean;
}
