import { Injectable } from "@nestjs/common";
import type { AppDefinition as PrismaAppDefinition } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppDefinition } from "../domain/app-definition.entity";
import { AppDefinitionRepository } from "../domain/app-definition.repository";

@Injectable()
export class PrismaAppDefinitionRepository implements AppDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<AppDefinition | null> {
    const record = await this.prisma.appDefinition.findUnique({ where: { key } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<AppDefinition[]> {
    const records = await this.prisma.appDefinition.findMany({ orderBy: { key: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async upsert(definition: AppDefinition): Promise<void> {
    const props = definition.toProps();
    await this.prisma.appDefinition.upsert({
      where: { key: props.key },
      create: {
        id: props.id,
        key: props.key,
        name: props.name,
        version: props.version,
        kind: props.kind,
        dependsOnKeys: [...props.dependsOnKeys],
        createdAt: props.createdAt,
      },
      update: {
        name: props.name,
        version: props.version,
        kind: props.kind,
        dependsOnKeys: [...props.dependsOnKeys],
      },
    });
  }

  private toDomain(record: PrismaAppDefinition): AppDefinition {
    return AppDefinition.create({
      id: record.id,
      key: record.key,
      name: record.name,
      version: record.version,
      kind: record.kind,
      dependsOnKeys: record.dependsOnKeys,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
