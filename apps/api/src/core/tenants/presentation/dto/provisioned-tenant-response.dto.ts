import { ApiProperty } from "@nestjs/swagger";
import type { ProvisionedTenant } from "../../application/ports/tenant-provisioning.repository";

class ProvisionedTenantSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
}

class ProvisionedMembershipSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;
}

class ProvisionedOrganizationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

class ProvisionedCompanySummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class ProvisionedTenantResponseDto {
  @ApiProperty({ type: ProvisionedTenantSummaryDto })
  tenant!: { id: string; slug: string; name: string; status: string };

  @ApiProperty({ type: ProvisionedMembershipSummaryDto })
  membership!: { id: string; status: string };

  @ApiProperty({ type: ProvisionedOrganizationSummaryDto })
  organization!: { id: string; code: string; name: string };

  @ApiProperty({ type: ProvisionedCompanySummaryDto, required: false })
  company?: { id: string; code: string; name: string };

  static fromResult(result: ProvisionedTenant): ProvisionedTenantResponseDto {
    const dto = new ProvisionedTenantResponseDto();
    dto.tenant = {
      id: result.tenant.id,
      slug: result.tenant.slug,
      name: result.tenant.name,
      status: result.tenant.status,
    };
    dto.membership = { id: result.ownerMembership.id, status: result.ownerMembership.status };
    dto.organization = {
      id: result.organization.id,
      code: result.organization.code,
      name: result.organization.name,
    };
    dto.company = result.company
      ? { id: result.company.id, code: result.company.code, name: result.company.name }
      : undefined;
    return dto;
  }
}
