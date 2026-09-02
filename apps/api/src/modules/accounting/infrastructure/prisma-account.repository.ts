import { Injectable } from "@nestjs/common";
import type { Account as PrismaAccount } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Account } from "../domain/account.entity";
import { AccountRepository, ListAccountsFilter } from "../domain/account.repository";

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Account | null> {
    const record = await this.prisma.account.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListAccountsFilter): Promise<Account[]> {
    const records = await this.prisma.account.findMany({
      where: { tenantId, companyId, type: filter.type, status: filter.status },
      orderBy: { code: "asc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(account: Account): Promise<void> {
    const props = account.toProps();
    await this.prisma.account.upsert({
      where: { id: props.id },
      create: props,
      update: { name: props.name, status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaAccount): Account {
    return Account.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      parentAccountId: record.parentAccountId,
      code: record.code,
      name: record.name,
      type: record.type,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
