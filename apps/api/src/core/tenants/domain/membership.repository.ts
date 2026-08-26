import { Membership } from "./membership.entity";

export interface MembershipRepository {
  findById(tenantId: string, id: string): Promise<Membership | null>;
  findByUserId(tenantId: string, userId: string): Promise<Membership | null>;
  save(membership: Membership): Promise<void>;
}

export const MEMBERSHIP_REPOSITORY = Symbol("MEMBERSHIP_REPOSITORY");
