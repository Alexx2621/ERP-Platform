import { Injectable } from "@nestjs/common";
import type { Permission as PrismaPermission } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Permission } from "../domain/permission.entity";
import { PermissionRepository } from "../domain/permission.repository";

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<Permission | null> {
    const record = await this.prisma.permission.findUnique({ where: { key } });
    return record ? this.toDomain(record) : null;
  }

  async findByKeys(keys: string[]): Promise<Permission[]> {
    if (keys.length === 0) return [];
    const records = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    return records.map((record) => this.toDomain(record));
  }

  async findAll(): Promise<Permission[]> {
    const records = await this.prisma.permission.findMany({ orderBy: { key: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async upsert(permission: Permission): Promise<void> {
    const props = permission.toProps();
    await this.prisma.permission.upsert({
      where: { key: props.key },
      create: { id: props.id, key: props.key, description: props.description, createdAt: props.createdAt },
      update: { description: props.description },
    });
  }

  private toDomain(record: PrismaPermission): Permission {
    return Permission.create({
      id: record.id,
      key: record.key,
      description: record.description,
      createdAt: record.createdAt,
    });
  }
}
