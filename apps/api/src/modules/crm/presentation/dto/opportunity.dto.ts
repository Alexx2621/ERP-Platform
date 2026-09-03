import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import type { Opportunity } from "../../domain/opportunity.entity";

const NON_NEGATIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const OPPORTUNITY_STATUSES = ["OPEN", "WON", "LOST"] as const;

export class CreateOpportunityDto {
  @ApiProperty({ example: "Acme Renewal" }) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty() @IsUUID() pipelineId!: string;
  @ApiProperty() @IsUUID() stageId!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() leadId?: string;
  @ApiProperty({ example: "5000.0000" }) @Matches(NON_NEGATIVE_DECIMAL, { message: "amount must be a non-negative decimal string with up to 4 fraction digits." }) amount!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiPropertyOptional({ example: "2026-03-01" }) @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional({ type: String, description: "Defaults to the caller." }) @IsOptional() @IsUUID() ownerId?: string;
}

export class UpdateOpportunityDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ example: "5000.0000" }) @Matches(NON_NEGATIVE_DECIMAL, { message: "amount must be a non-negative decimal string with up to 4 fraction digits." }) amount!: string;
  @ApiPropertyOptional({ example: "2026-03-01" }) @IsOptional() @IsDateString() expectedCloseDate?: string;
}

export class MoveOpportunityStageDto {
  @ApiProperty() @IsUUID() stageId!: string;
}

export class ListOpportunitiesQueryDto {
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() pipelineId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() stageId?: string;
  @ApiPropertyOptional({ enum: OPPORTUNITY_STATUSES }) @IsOptional() @IsIn(OPPORTUNITY_STATUSES) status?: (typeof OPPORTUNITY_STATUSES)[number];
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() ownerId?: string;
}

export class OpportunityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() pipelineId!: string;
  @ApiProperty() stageId!: string;
  @ApiProperty({ type: String, nullable: true }) customerId!: string | null;
  @ApiProperty({ type: String, nullable: true }) leadId!: string | null;
  @ApiProperty({ example: "5000.0000" }) amount!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) expectedCloseDate!: string | null;
  @ApiProperty({ enum: OPPORTUNITY_STATUSES }) status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) closedAt!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(opportunity: Opportunity): OpportunityResponseDto {
    const dto = new OpportunityResponseDto();
    dto.id = opportunity.id;
    dto.name = opportunity.name;
    dto.pipelineId = opportunity.pipelineId;
    dto.stageId = opportunity.stageId;
    dto.customerId = opportunity.customerId;
    dto.leadId = opportunity.leadId;
    dto.amount = opportunity.amount;
    dto.currency = opportunity.currency;
    dto.expectedCloseDate = opportunity.expectedCloseDate ? opportunity.expectedCloseDate.toISOString() : null;
    dto.status = opportunity.status;
    dto.ownerId = opportunity.ownerId;
    dto.closedAt = opportunity.closedAt ? opportunity.closedAt.toISOString() : null;
    dto.createdAt = opportunity.createdAt.toISOString();
    dto.updatedAt = opportunity.updatedAt.toISOString();
    return dto;
  }
}
