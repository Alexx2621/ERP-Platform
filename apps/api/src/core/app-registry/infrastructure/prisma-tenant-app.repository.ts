import { Injectable } from "@nestjs/common";
import type { TenantApp as PrismaTenantApp } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TenantApp } from "../domain/tenant-app.entity";
import { TenantAppRepository } from "../domain/tenant-app.repository";

@Injectable()
export class PrismaTenantAppRepository implements TenantAppRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<TenantApp[]> {
    const records = await this.prisma.tenantApp.findMany({ where: { tenantId } });
    return records.map((record) => this.toDomain(record));
  }

  async findByTenantAndAppDefinition(tenantId: string, appDefinitionId: string): Promise<TenantApp | null> {
    const record = await this.prisma.tenantApp.findUnique({
      where: { tenantId_appDefinitionId: { tenantId, appDefinitionId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(tenantApp: TenantApp): Promise<void> {
    const props = tenantApp.toProps();
    await this.prisma.tenantApp.upsert({
      where: { tenantId_appDefinitionId: { tenantId: props.tenantId, appDefinitionId: props.appDefinitionId } },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        appDefinitionId: props.appDefinitionId,
        status: props.status,
        enabledAt: props.enabledAt,
        disabledAt: props.disabledAt,
        createdAt: props.createdAt,
      },
      update: {
        status: props.status,
        enabledAt: props.enabledAt,
        disabledAt: props.disabledAt,
      },
    });
  }

  private toDomain(record: PrismaTenantApp): TenantApp {
    return TenantApp.create({
      id: record.id,
      tenantId: record.tenantId,
      appDefinitionId: record.appDefinitionId,
      status: record.status,
      enabledAt: record.enabledAt,
      disabledAt: record.disabledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
