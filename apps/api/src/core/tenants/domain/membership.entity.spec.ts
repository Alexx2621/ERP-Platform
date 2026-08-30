import { InvalidMembershipTransitionError, Membership } from "./membership.entity";

function invited(overrides: Partial<Parameters<typeof Membership.create>[0]> = {}): Membership {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return Membership.create({
    id: "membership-1",
    tenantId: "tenant-1",
    userId: "user-1",
    status: "INVITED",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe("Membership", () => {
  describe("activate/suspend/revoke", () => {
    it("activates a pending invitation", () => {
      const membership = invited();
      membership.activate();
      expect(membership.status).toBe("ACTIVE");
    });

    it("rejects activating an already-revoked membership", () => {
      const membership = invited({ status: "REVOKED" });
      expect(() => membership.activate()).toThrow(InvalidMembershipTransitionError);
    });

    it("revokes a pending invitation", () => {
      const membership = invited();
      membership.revoke();
      expect(membership.status).toBe("REVOKED");
    });

    it("rejects revoking an already-revoked membership", () => {
      const membership = invited({ status: "REVOKED" });
      expect(() => membership.revoke()).toThrow(InvalidMembershipTransitionError);
    });
  });

  describe("isExpiredInvitation", () => {
    const invitedAt = new Date("2026-01-01T00:00:00.000Z");
    const ttlSeconds = 7 * 24 * 60 * 60;

    it("is not expired for a non-INVITED membership regardless of age", () => {
      const membership = invited({ status: "ACTIVE", updatedAt: invitedAt });
      const farFuture = new Date(invitedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
      expect(membership.isExpiredInvitation(farFuture, ttlSeconds)).toBe(false);
    });

    it("is not expired within the TTL window", () => {
      const membership = invited({ updatedAt: invitedAt });
      const withinWindow = new Date(invitedAt.getTime() + (ttlSeconds - 1) * 1000);
      expect(membership.isExpiredInvitation(withinWindow, ttlSeconds)).toBe(false);
    });

    it("is expired once the TTL window has passed", () => {
      const membership = invited({ updatedAt: invitedAt });
      const afterWindow = new Date(invitedAt.getTime() + (ttlSeconds + 1) * 1000);
      expect(membership.isExpiredInvitation(afterWindow, ttlSeconds)).toBe(true);
    });
  });

  describe("reinvite", () => {
    it("reopens a revoked membership as a fresh invitation", () => {
      const membership = invited({ status: "REVOKED" });
      membership.reinvite();
      expect(membership.status).toBe("INVITED");
    });

    it("resets the expiry clock (bumps updatedAt) when reinviting", () => {
      const oldTimestamp = new Date("2026-01-01T00:00:00.000Z");
      const membership = invited({ status: "REVOKED", updatedAt: oldTimestamp });
      membership.reinvite();
      expect(membership.updatedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime());
    });

    it("reissues an already-INVITED membership (the expired case, checked by the caller)", () => {
      const membership = invited();
      membership.reinvite();
      expect(membership.status).toBe("INVITED");
    });

    it("rejects reinviting an ACTIVE membership", () => {
      const membership = invited({ status: "ACTIVE" });
      expect(() => membership.reinvite()).toThrow(InvalidMembershipTransitionError);
    });

    it("rejects reinviting a SUSPENDED membership", () => {
      const membership = invited({ status: "SUSPENDED" });
      expect(() => membership.reinvite()).toThrow(InvalidMembershipTransitionError);
    });
  });
});
