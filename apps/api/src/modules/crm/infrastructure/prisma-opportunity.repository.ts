import { Injectable } from "@nestjs/common";
import type { Opportunity as PrismaOpportunity } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Opportunity } from "../domain/opportunity.entity";
import { ListOpportunitiesFilter, OpportunityRepository } from "../domain/opportunity.repository";

@Injectable()
export class PrismaOpportunityRepository implements OpportunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Opportunity | null> {
    const record = await this.prisma.opportunity.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListOpportunitiesFilter): Promise<Opportunity[]> {
    const records = await this.prisma.opportunity.findMany({
      where: { tenantId, companyId, pipelineId: filter.pipelineId, stageId: filter.stageId, status: filter.status, ownerId: filter.ownerId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async listOpenByPipeline(tenantId: string, pipelineId: string): Promise<Opportunity[]> {
    const records = await this.prisma.opportunity.findMany({ where: { tenantId, pipelineId, status: "OPEN" } });
    return records.map((record) => this.toDomain(record));
  }

  async save(opportunity: Opportunity): Promise<void> {
    const props = opportunity.toProps();
    await this.prisma.opportunity.upsert({
      where: { id: props.id },
      create: props,
      update: {
        name: props.name,
        stageId: props.stageId,
        amount: props.amount,
        expectedCloseDate: props.expectedCloseDate,
        status: props.status,
        ownerId: props.ownerId,
        closedAt: props.closedAt,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaOpportunity): Opportunity {
    return Opportunity.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      name: record.name,
      pipelineId: record.pipelineId,
      stageId: record.stageId,
      customerId: record.customerId,
      leadId: record.leadId,
      // .toFixed(4), not .toString() — Decimal.js's .toString() strips
      // trailing zeros, disagreeing with what numeric(14,4) actually
      // stores (the Catalog/Taxes/Accounting precedent, applied
      // proactively here).
      amount: record.amount.toFixed(4),
      currency: record.currency,
      expectedCloseDate: record.expectedCloseDate,
      status: record.status,
      ownerId: record.ownerId,
      closedAt: record.closedAt,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
