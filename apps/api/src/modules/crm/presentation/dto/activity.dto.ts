import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type { Activity } from "../../domain/activity.entity";

const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE", "TASK"] as const;

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES }) @IsIn(ACTIVITY_TYPES) type!: (typeof ACTIVITY_TYPES)[number];
  @ApiProperty({ example: "Intro call" }) @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional({ type: String, description: "Exactly one of relatedLeadId/relatedOpportunityId/relatedCustomerId is required." }) @IsOptional() @IsUUID() relatedLeadId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() relatedOpportunityId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() relatedCustomerId?: string;
  @ApiPropertyOptional({ example: "2026-01-20T15:00:00.000Z" }) @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional({ type: String, description: "Defaults to the caller." }) @IsOptional() @IsUUID() ownerId?: string;
}

export class ListActivitiesQueryDto {
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() relatedLeadId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() relatedOpportunityId?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUUID() relatedCustomerId?: string;
}

export class ActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ACTIVITY_TYPES }) type!: string;
  @ApiProperty() subject!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: String, nullable: true }) relatedLeadId!: string | null;
  @ApiProperty({ type: String, nullable: true }) relatedOpportunityId!: string | null;
  @ApiProperty({ type: String, nullable: true }) relatedCustomerId!: string | null;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) dueAt!: string | null;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) completedAt!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(activity: Activity): ActivityResponseDto {
    const dto = new ActivityResponseDto();
    dto.id = activity.id;
    dto.type = activity.type;
    dto.subject = activity.subject;
    dto.notes = activity.notes;
    dto.relatedLeadId = activity.relatedLeadId;
    dto.relatedOpportunityId = activity.relatedOpportunityId;
    dto.relatedCustomerId = activity.relatedCustomerId;
    dto.ownerId = activity.ownerId;
    dto.dueAt = activity.dueAt ? activity.dueAt.toISOString() : null;
    dto.completedAt = activity.completedAt ? activity.completedAt.toISOString() : null;
    dto.createdAt = activity.createdAt.toISOString();
    return dto;
  }
}
