import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Organization } from "../domain/organization.entity";
import { OrganizationRepository } from "../domain/organization.repository";

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    return record ? Organization.create(record) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    return record ? Organization.create(record) : null;
  }

  async save(organization: Organization): Promise<void> {
    const props = organization.toProps();
    await this.prisma.organization.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        name: props.name,
        status: props.status,
        version: props.version,
      },
    });
  }
}
