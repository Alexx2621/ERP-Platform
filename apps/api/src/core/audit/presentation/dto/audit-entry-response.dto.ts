import type { AuditEntry } from "../../domain/audit-entry.entity";

export class AuditEntryResponseDto {
  id!: string;
  userId!: string | null;
  tenantId!: string | null;
  companyId!: string | null;
  action!: string;
  resource!: string;
  resourceId!: string | null;
  previousValues!: unknown;
  newValues!: unknown;
  ipAddress!: string | null;
  userAgent!: string | null;
  correlationId!: string;
  createdAt!: string;

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
