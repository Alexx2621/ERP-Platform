import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Company } from "../domain/company.entity";
import { CompanyRepository } from "../domain/company.repository";

@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Company | null> {
    const record = await this.prisma.company.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    return record ? Company.create(record) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Company | null> {
    const record = await this.prisma.company.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    return record ? Company.create(record) : null;
  }

  async save(company: Company): Promise<void> {
    const props = company.toProps();
    await this.prisma.company.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        name: props.name,
        status: props.status,
        version: props.version,
      },
    });
  }
}
