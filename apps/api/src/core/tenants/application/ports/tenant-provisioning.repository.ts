import type { Company } from "../../../companies";
import type { Organization } from "../../../organizations";
import { Membership } from "../../domain/membership.entity";
import { Tenant } from "../../domain/tenant.entity";

export interface ProvisionedTenant {
  tenant: Tenant;
  ownerMembership: Membership;
  organization: Organization;
  company?: Company;
}

export interface FindProvisionedTenantInput {
  slug: string;
  ownerUserId: string;
  organizationCode: string;
  companyCode?: string;
}

export interface TenantProvisioningRepository {
  findExisting(input: FindProvisionedTenantInput): Promise<ProvisionedTenant | null>;
  create(provisioned: ProvisionedTenant): Promise<void>;
}

export const TENANT_PROVISIONING_REPOSITORY = Symbol("TENANT_PROVISIONING_REPOSITORY");
