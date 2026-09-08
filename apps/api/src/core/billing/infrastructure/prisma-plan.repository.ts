import { Injectable } from "@nestjs/common";
import type { Plan as PrismaPlan } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Plan } from "../domain/plan.entity";
import { PlanRepository } from "../domain/plan.repository";

@Injectable()
export class PrismaPlanRepository implements PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { key } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Plan[]> {
    const records = await this.prisma.plan.findMany({ orderBy: { basePriceAmount: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async upsert(plan: Plan): Promise<void> {
    const props = plan.toProps();
    await this.prisma.plan.upsert({
      where: { key: props.key },
      create: {
        id: props.id,
        key: props.key,
        name: props.name,
        description: props.description,
        currency: props.currency,
        basePriceAmount: props.basePriceAmount,
        perUserPriceAmount: props.perUserPriceAmount,
        includesAppKeys: [...props.includesAppKeys],
        isSelfServe: props.isSelfServe,
        recurrenteProductId: props.recurrenteProductId,
        recurrentePriceId: props.recurrentePriceId,
        createdAt: props.createdAt,
      },
      update: {
        name: props.name,
        description: props.description,
        currency: props.currency,
        basePriceAmount: props.basePriceAmount,
        perUserPriceAmount: props.perUserPriceAmount,
        includesAppKeys: [...props.includesAppKeys],
        isSelfServe: props.isSelfServe,
        recurrenteProductId: props.recurrenteProductId,
        recurrentePriceId: props.recurrentePriceId,
      },
    });
  }

  private toDomain(record: PrismaPlan): Plan {
    return Plan.create({
      id: record.id,
      key: record.key,
      name: record.name,
      description: record.description,
      currency: record.currency,
      basePriceAmount: record.basePriceAmount.toFixed(4),
      perUserPriceAmount: record.perUserPriceAmount.toFixed(4),
      includesAppKeys: record.includesAppKeys,
      isSelfServe: record.isSelfServe,
      recurrenteProductId: record.recurrenteProductId,
      recurrentePriceId: record.recurrentePriceId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
