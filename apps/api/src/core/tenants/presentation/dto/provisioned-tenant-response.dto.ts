import type { ProvisionedTenant } from "../../application/ports/tenant-provisioning.repository";

export class ProvisionedTenantResponseDto {
  tenant!: { id: string; slug: string; name: string; status: string };
  membership!: { id: string; status: string };
  organization!: { id: string; code: string; name: string };
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
