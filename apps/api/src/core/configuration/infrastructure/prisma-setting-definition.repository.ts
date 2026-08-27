import { Injectable } from "@nestjs/common";
import type { Prisma, SettingDefinition as PrismaSettingDefinition } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ConfigScopeType, SettingDefinition } from "../domain/setting-definition.entity";
import { SettingDefinitionRepository } from "../domain/setting-definition.repository";

@Injectable()
export class PrismaSettingDefinitionRepository implements SettingDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<SettingDefinition | null> {
    const record = await this.prisma.settingDefinition.findUnique({ where: { key } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<SettingDefinition[]> {
    const records = await this.prisma.settingDefinition.findMany({ orderBy: { key: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async upsert(definition: SettingDefinition): Promise<void> {
    const props = definition.toProps();
    const data = {
      id: props.id,
      key: props.key,
      dataType: props.dataType,
      description: props.description,
      defaultValue: props.defaultValue as Prisma.InputJsonValue,
      allowedScopes: [...props.allowedScopes],
      createdAt: props.createdAt,
    };
    await this.prisma.settingDefinition.upsert({
      where: { key: props.key },
      create: data,
      update: {
        dataType: data.dataType,
        description: data.description,
        defaultValue: data.defaultValue,
        allowedScopes: data.allowedScopes,
      },
    });
  }

  private toDomain(record: PrismaSettingDefinition): SettingDefinition {
    return SettingDefinition.create({
      id: record.id,
      key: record.key,
      dataType: record.dataType,
      description: record.description,
      defaultValue: record.defaultValue,
      allowedScopes: record.allowedScopes as ConfigScopeType[],
      createdAt: record.createdAt,
    });
  }
}
