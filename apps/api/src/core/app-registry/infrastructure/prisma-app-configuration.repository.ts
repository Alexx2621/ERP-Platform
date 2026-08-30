import { Injectable } from "@nestjs/common";
import { Prisma, type AppConfiguration as PrismaAppConfiguration } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppConfiguration } from "../domain/app-configuration.entity";
import { AppConfigurationRepository } from "../domain/app-configuration.repository";

@Injectable()
export class PrismaAppConfigurationRepository implements AppConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantApp(tenantAppId: string): Promise<AppConfiguration[]> {
    const records = await this.prisma.appConfiguration.findMany({
      where: { tenantAppId },
      orderBy: { key: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByTenantAppAndKey(tenantAppId: string, key: string): Promise<AppConfiguration | null> {
    const record = await this.prisma.appConfiguration.findUnique({
      where: { tenantAppId_key: { tenantAppId, key } },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(configuration: AppConfiguration): Promise<void> {
    const props = configuration.toProps();
    await this.prisma.appConfiguration.upsert({
      where: { tenantAppId_key: { tenantAppId: props.tenantAppId, key: props.key } },
      create: {
        id: props.id,
        tenantAppId: props.tenantAppId,
        key: props.key,
        value: props.value as Prisma.InputJsonValue,
        createdAt: props.createdAt,
      },
      update: { value: props.value as Prisma.InputJsonValue },
    });
  }

  private toDomain(record: PrismaAppConfiguration): AppConfiguration {
    return AppConfiguration.create({
      id: record.id,
      tenantAppId: record.tenantAppId,
      key: record.key,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
