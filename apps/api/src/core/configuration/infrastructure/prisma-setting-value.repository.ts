import { Injectable } from "@nestjs/common";
import { Prisma, type SettingValue as PrismaSettingValue } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { ConfigScopeType } from "../domain/setting-definition.entity";
import { SettingValue } from "../domain/setting-value.entity";
import { SettingValueRepository } from "../domain/setting-value.repository";
import { CompanyNotFoundInTenantError } from "../application/errors";

const FOREIGN_KEY_VIOLATION = "P2003";

@Injectable()
export class PrismaSettingValueRepository implements SettingValueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByScope(
    definitionId: string,
    scopeType: ConfigScopeType,
    scopeKey: string,
  ): Promise<SettingValue | null> {
    const record = await this.prisma.settingValue.findUnique({
      where: { definitionId_scopeType_scopeKey: { definitionId, scopeType, scopeKey } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByDefinitionAndTenant(definitionId: string, tenantId: string): Promise<SettingValue[]> {
    const records = await this.prisma.settingValue.findMany({ where: { definitionId, tenantId } });
    return records.map((record) => this.toDomain(record));
  }

  async save(value: SettingValue): Promise<void> {
    const props = value.toProps();
    const scopeKey = value.scopeKey;
    try {
      await this.prisma.settingValue.upsert({
        where: {
          definitionId_scopeType_scopeKey: {
            definitionId: props.definitionId,
            scopeType: props.scopeType,
            scopeKey,
          },
        },
        create: {
          id: props.id,
          definitionId: props.definitionId,
          scopeType: props.scopeType,
          tenantId: props.tenantId,
          companyId: props.companyId,
          scopeKey,
          value: props.value as Prisma.InputJsonValue,
        },
        update: { value: props.value as Prisma.InputJsonValue },
      });
    } catch (error) {
      // The composite (tenantId, companyId) FK is what actually prevents a
      // companyId from a different tenant — this module never queries
      // Companies to pre-validate it (docs/SECURITY.md).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === FOREIGN_KEY_VIOLATION) {
        throw new CompanyNotFoundInTenantError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaSettingValue): SettingValue {
    return SettingValue.create({
      id: record.id,
      definitionId: record.definitionId,
      scopeType: record.scopeType,
      tenantId: record.tenantId,
      companyId: record.companyId,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
