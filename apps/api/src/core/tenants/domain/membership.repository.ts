import { Membership } from "./membership.entity";

export interface MembershipRepository {
  findById(tenantId: string, id: string): Promise<Membership | null>;
  findByUserId(tenantId: string, userId: string): Promise<Membership | null>;
  /**
   * Cross-tenant by design: this is the one place a user needs to discover
   * "which tenants can I access" before any tenant is known (tenant picker /
   * onboarding). Every other membership query stays tenant-scoped.
   */
  findActiveByUserId(userId: string): Promise<Membership[]>;
  save(membership: Membership): Promise<void>;
}

export const MEMBERSHIP_REPOSITORY = Symbol("MEMBERSHIP_REPOSITORY");
