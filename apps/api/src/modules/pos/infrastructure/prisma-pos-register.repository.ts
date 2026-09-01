import { Injectable } from "@nestjs/common";
import type { PosRegister as PrismaPosRegister } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PosRegister } from "../domain/pos-register.entity";
import { ListPosRegistersFilter, PosRegisterRepository } from "../domain/pos-register.repository";

@Injectable()
export class PrismaPosRegisterRepository implements PosRegisterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PosRegister | null> {
    const record = await this.prisma.posRegister.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<PosRegister | null> {
    const record = await this.prisma.posRegister.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosRegistersFilter): Promise<PosRegister[]> {
    const records = await this.prisma.posRegister.findMany({
      where: { tenantId, companyId, status: filter.status },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(register: PosRegister): Promise<void> {
    const props = register.toProps();
    await this.prisma.posRegister.upsert({
      where: { id: props.id },
      create: props,
      update: { status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaPosRegister): PosRegister {
    return PosRegister.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      warehouseId: record.warehouseId,
      code: record.code,
      name: record.name,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
