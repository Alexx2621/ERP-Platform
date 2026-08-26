import { InvalidTenantTransitionError, Tenant } from "./tenant.entity";

describe("Tenant lifecycle", () => {
  it("allows the non-destructive provisioning lifecycle", () => {
    const now = new Date();
    const tenant = Tenant.create({
      id: "tenant-a",
      slug: "tenant-a",
      name: "Tenant A",
      status: "PROVISIONING",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    tenant.activate();
    tenant.suspend();
    tenant.beginClosing();
    tenant.close();

    expect(tenant.status).toBe("CLOSED");
    expect(tenant.version).toBe(5);
  });

  it("rejects invalid transitions out of CLOSED", () => {
    const now = new Date();
    const tenant = Tenant.create({
      id: "tenant-a",
      slug: "tenant-a",
      name: "Tenant A",
      status: "CLOSED",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    expect(() => tenant.activate()).toThrow(InvalidTenantTransitionError);
  });
});
