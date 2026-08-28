import { Membership } from "../domain/membership.entity";
import { MembershipRepository } from "../domain/membership.repository";

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly records = new Map<string, Membership>();

  async findById(tenantId: string, id: string): Promise<Membership | null> {
    return this.records.get(this.key(tenantId, id)) ?? null;
  }

  async findByUserId(tenantId: string, userId: string): Promise<Membership | null> {
    for (const membership of this.records.values()) {
      if (membership.tenantId === tenantId && membership.userId === userId) return membership;
    }
    return null;
  }

  async findActiveByUserId(userId: string): Promise<Membership[]> {
    return [...this.records.values()].filter((m) => m.userId === userId && m.isActive());
  }

  async findPendingByUserId(userId: string): Promise<Membership[]> {
    return [...this.records.values()].filter((m) => m.userId === userId && m.status === "INVITED");
  }

  async findByTenant(tenantId: string): Promise<Membership[]> {
    return [...this.records.values()].filter((m) => m.tenantId === tenantId);
  }

  async save(membership: Membership): Promise<void> {
    this.records.set(this.key(membership.tenantId, membership.id), membership);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
