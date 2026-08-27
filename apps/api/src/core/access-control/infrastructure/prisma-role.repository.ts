import { Injectable } from "@nestjs/common";
import type { Prisma } from "@erp/database";
import { Role } from "../domain/role.entity";
import { RoleRepository } from "../domain/role.repository";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const WITH_PERMISSIONS = { rolePermissions: { include: { permission: true } } } as const;

type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof WITH_PERMISSIONS }>;

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: WITH_PERMISSIONS,
    });
    return record ? this.toDomain(record) : null;
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Role[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.role.findMany({
      where: { tenantId, id: { in: ids } },
      include: WITH_PERMISSIONS,
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByName(tenantId: string, name: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name } },
      include: WITH_PERMISSIONS,
    });
    return record ? this.toDomain(record) : null;
  }

  async findByTenant(tenantId: string): Promise<Role[]> {
    const records = await this.prisma.role.findMany({
      where: { tenantId },
      include: WITH_PERMISSIONS,
      orderBy: { name: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(role: Role): Promise<void> {
    const props = role.toProps();
    const permissionRecords =
      props.permissionKeys.length > 0
        ? await this.prisma.permission.findMany({ where: { key: { in: [...props.permissionKeys] } } })
        : [];

    await this.prisma.$transaction(async (tx) => {
      await tx.role.upsert({
        where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
        create: { id: props.id, tenantId: props.tenantId, name: props.name, isSystem: props.isSystem },
        update: { name: props.name },
      });
      await tx.rolePermission.deleteMany({ where: { tenantId: props.tenantId, roleId: props.id } });
      if (permissionRecords.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionRecords.map((permission) => ({
            tenantId: props.tenantId,
            roleId: props.id,
            permissionId: permission.id,
          })),
        });
      }
    });
  }

  private toDomain(record: RoleWithPermissions): Role {
    return Role.create({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      isSystem: record.isSystem,
      permissionKeys: record.rolePermissions.map((rp) => rp.permission.key),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
