import { Injectable } from "@nestjs/common";
import type { Activity as PrismaActivity } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Activity } from "../domain/activity.entity";
import { ActivityRepository, ListActivitiesFilter } from "../domain/activity.repository";

@Injectable()
export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Activity | null> {
    const record = await this.prisma.activity.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListActivitiesFilter): Promise<Activity[]> {
    const records = await this.prisma.activity.findMany({
      where: {
        tenantId,
        companyId,
        relatedLeadId: filter.relatedLeadId,
        relatedOpportunityId: filter.relatedOpportunityId,
        relatedCustomerId: filter.relatedCustomerId,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(activity: Activity): Promise<void> {
    const props = activity.toProps();
    await this.prisma.activity.upsert({
      where: { id: props.id },
      create: props,
      update: { completedAt: props.completedAt },
    });
  }

  private toDomain(record: PrismaActivity): Activity {
    return Activity.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      type: record.type,
      subject: record.subject,
      notes: record.notes,
      relatedLeadId: record.relatedLeadId,
      relatedOpportunityId: record.relatedOpportunityId,
      relatedCustomerId: record.relatedCustomerId,
      ownerId: record.ownerId,
      dueAt: record.dueAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
