import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Company } from "../../companies";
import { Organization } from "../../organizations";
import {
  FindProvisionedTenantInput,
  ProvisionedTenant,
  TenantProvisioningRepository,
} from "../application/ports/tenant-provisioning.repository";
import { Membership } from "../domain/membership.entity";
import { Tenant } from "../domain/tenant.entity";

@Injectable()
export class PrismaTenantProvisioningRepository implements TenantProvisioningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findExisting(input: FindProvisionedTenantInput): Promise<ProvisionedTenant | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { slug: input.slug },
      include: {
        memberships: { where: { userId: input.ownerUserId }, take: 1 },
        organizations: {
          where: { code: input.organizationCode },
          take: 1,
          include: {
            companies: input.companyCode ? { where: { code: input.companyCode }, take: 1 } : false,
          },
        },
      },
    });
    const membership = record?.memberships[0];
    const organization = record?.organizations[0];
    if (!record || !membership || !organization) return null;

    const companyRecord = input.companyCode ? organization.companies[0] : undefined;
    if (input.companyCode && !companyRecord) return null;

    return {
      tenant: Tenant.create({
        id: record.id,
        slug: record.slug,
        name: record.name,
        status: record.status,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }),
      ownerMembership: Membership.create(membership),
      organization: Organization.create({
        id: organization.id,
        tenantId: organization.tenantId,
        code: organization.code,
        name: organization.name,
        status: organization.status,
        version: organization.version,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      }),
      company: companyRecord ? Company.create(companyRecord) : undefined,
    };
  }

  async create(provisioned: ProvisionedTenant): Promise<void> {
    const tenant = provisioned.tenant.toProps();
    const membership = provisioned.ownerMembership.toProps();
    const organization = provisioned.organization.toProps();
    const company = provisioned.company?.toProps();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.tenant.create({ data: tenant });
      await transaction.membership.create({ data: membership });
      await transaction.organization.create({ data: organization });
      if (company) await transaction.company.create({ data: company });
    });
  }
}
