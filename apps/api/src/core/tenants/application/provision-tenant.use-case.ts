import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { USER_REPOSITORY, UserRepository } from "../../users";
import { Company, normalizeCompanyCode } from "../../companies";
import { Organization, normalizeOrganizationCode } from "../../organizations";
import { Membership } from "../domain/membership.entity";
import { normalizeTenantSlug } from "../domain/normalize-tenant-slug";
import { TENANT_REPOSITORY, TenantRepository } from "../domain/tenant.repository";
import { Tenant } from "../domain/tenant.entity";
import {
  TENANT_PROVISIONING_REPOSITORY,
  ProvisionedTenant,
  TenantProvisioningRepository,
} from "./ports/tenant-provisioning.repository";
import { ProvisioningUserUnavailableError, TenantSlugAlreadyInUseError } from "./errors";

export interface ProvisionTenantInput {
  slug: string;
  name: string;
  ownerUserId: string;
  organization: { code: string; name: string };
  company?: { code: string; name: string };
}

@Injectable()
export class ProvisionTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(TENANT_PROVISIONING_REPOSITORY)
    private readonly provisioning: TenantProvisioningRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: ProvisionTenantInput): Promise<ProvisionedTenant> {
    const user = await this.users.findById(input.ownerUserId);
    if (!user?.isActive()) throw new ProvisioningUserUnavailableError(input.ownerUserId);

    const slug = normalizeTenantSlug(input.slug);
    const organizationCode = normalizeOrganizationCode(input.organization.code);
    const companyCode = input.company ? normalizeCompanyCode(input.company.code) : undefined;
    const existingTenant = await this.tenants.findBySlug(slug);

    if (existingTenant) {
      const existing = await this.provisioning.findExisting({
        slug,
        ownerUserId: input.ownerUserId,
        organizationCode,
        companyCode,
      });
      if (existing) return existing;
      throw new TenantSlugAlreadyInUseError(slug);
    }

    const now = new Date();
    const tenant = Tenant.create({
      id: newId(),
      slug,
      name: input.name,
      status: "PROVISIONING",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const ownerMembership = Membership.create({
      id: newId(),
      tenantId: tenant.id,
      userId: user.id,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    const organization = Organization.create({
      id: newId(),
      tenantId: tenant.id,
      code: organizationCode,
      name: input.organization.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const company = input.company
      ? Company.create({
          id: newId(),
          tenantId: tenant.id,
          organizationId: organization.id,
          code: companyCode as string,
          name: input.company.name,
          status: "ACTIVE",
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
      : undefined;

    tenant.activate();
    const provisioned = { tenant, ownerMembership, organization, company };
    await this.provisioning.create(provisioned);
    return provisioned;
  }
}
