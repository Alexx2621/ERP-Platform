import { ApiProperty } from "@nestjs/swagger";
import type { MyTenantSummary } from "../../application/list-my-tenants.use-case";
import type { TenantExecutionContext } from "../../application/tenant-execution-context";

export class TenantSummaryResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() membershipId!: string;

  static fromDomain(summary: MyTenantSummary): TenantSummaryResponseDto {
    const dto = new TenantSummaryResponseDto();
    dto.tenantId = summary.tenantId;
    dto.slug = summary.slug;
    dto.name = summary.name;
    dto.membershipId = summary.membershipId;
    return dto;
  }
}

export class TenantExecutionContextResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty() membershipId!: string;
  @ApiProperty({ type: String, required: false }) companyId?: string;

  static fromDomain(context: TenantExecutionContext): TenantExecutionContextResponseDto {
    const dto = new TenantExecutionContextResponseDto();
    dto.tenantId = context.tenantId;
    dto.membershipId = context.membershipId;
    dto.companyId = context.companyId;
    return dto;
  }
}
