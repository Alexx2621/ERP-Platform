import { ApiProperty } from "@nestjs/swagger";
import type { AuditEntry } from "../../domain/audit-entry.entity";

export class AuditEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, description: "The actor; null for unauthenticated/system-initiated events." })
  userId!: string | null;
  @ApiProperty({ nullable: true }) tenantId!: string | null;
  @ApiProperty({ nullable: true }) companyId!: string | null;
  @ApiProperty({ example: "configuration.setting.changed" }) action!: string;
  @ApiProperty({ example: "SettingValue" }) resource!: string;
  @ApiProperty({ nullable: true }) resourceId!: string | null;
  @ApiProperty({ type: Object, nullable: true }) previousValues!: unknown;
  @ApiProperty({ type: Object, nullable: true }) newValues!: unknown;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
  @ApiProperty({ nullable: true }) userAgent!: string | null;
  @ApiProperty() correlationId!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;

  static fromDomain(entry: AuditEntry): AuditEntryResponseDto {
    const dto = new AuditEntryResponseDto();
    dto.id = entry.id;
    dto.userId = entry.userId;
    dto.tenantId = entry.tenantId;
    dto.companyId = entry.companyId;
    dto.action = entry.action;
    dto.resource = entry.resource;
    dto.resourceId = entry.resourceId;
    dto.previousValues = entry.previousValues;
    dto.newValues = entry.newValues;
    dto.ipAddress = entry.ipAddress;
    dto.userAgent = entry.userAgent;
    dto.correlationId = entry.correlationId;
    dto.createdAt = entry.createdAt.toISOString();
    return dto;
  }
}
