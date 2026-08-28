import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Membership } from "../domain/membership.entity";
import { MembershipRepository } from "../domain/membership.repository";

@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Membership | null> {
    const record = await this.prisma.membership.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    return record ? Membership.create(record) : null;
  }

  async findByUserId(tenantId: string, userId: string): Promise<Membership | null> {
    const record = await this.prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return record ? Membership.create(record) : null;
  }

  async findActiveByUserId(userId: string): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({ where: { userId, status: "ACTIVE" } });
    return records.map((record) => Membership.create(record));
  }

  async findPendingByUserId(userId: string): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({
      where: { userId, status: "INVITED" },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => Membership.create(record));
  }

  async findByTenant(tenantId: string): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => Membership.create(record));
  }

  async save(membership: Membership): Promise<void> {
    const props = membership.toProps();
    await this.prisma.membership.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: { status: props.status },
    });
  }
}
