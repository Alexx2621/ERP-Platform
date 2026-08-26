import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Tenant } from "../domain/tenant.entity";
import { TenantRepository } from "../domain/tenant.repository";

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { id } });
    return record ? Tenant.create(record) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { slug } });
    return record ? Tenant.create(record) : null;
  }

  async save(tenant: Tenant): Promise<void> {
    const props = tenant.toProps();
    await this.prisma.tenant.upsert({
      where: { id: props.id },
      create: props,
      update: {
        name: props.name,
        status: props.status,
        version: props.version,
      },
    });
  }
}
