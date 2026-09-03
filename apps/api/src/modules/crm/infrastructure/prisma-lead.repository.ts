import { Injectable } from "@nestjs/common";
import type { Lead as PrismaLead } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Lead } from "../domain/lead.entity";
import { LeadRepository, ListLeadsFilter } from "../domain/lead.repository";

@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Lead | null> {
    const record = await this.prisma.lead.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListLeadsFilter): Promise<Lead[]> {
    const records = await this.prisma.lead.findMany({
      where: { tenantId, companyId, status: filter.status, ownerId: filter.ownerId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(lead: Lead): Promise<void> {
    const props = lead.toProps();
    await this.prisma.lead.upsert({
      where: { id: props.id },
      create: props,
      update: {
        name: props.name,
        companyName: props.companyName,
        email: props.email,
        phone: props.phone,
        source: props.source,
        status: props.status,
        ownerId: props.ownerId,
        consentMarketing: props.consentMarketing,
        consentedAt: props.consentedAt,
        convertedCustomerId: props.convertedCustomerId,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaLead): Lead {
    return Lead.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      name: record.name,
      companyName: record.companyName,
      email: record.email,
      phone: record.phone,
      source: record.source,
      status: record.status,
      ownerId: record.ownerId,
      consentMarketing: record.consentMarketing,
      consentedAt: record.consentedAt,
      convertedCustomerId: record.convertedCustomerId,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
