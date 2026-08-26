import type { ExecutionContext } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { Tenant } from "../domain/tenant.entity";
import { Membership } from "../domain/membership.entity";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { ResolveTenantContextUseCase } from "../application/resolve-tenant-context.use-case";
import { Company, CompanyRepository } from "../../companies";
import { TenantContextGuard, TENANT_SLUG_HEADER } from "./tenant-context.guard";

const now = new Date();

class StubCompanyRepository implements CompanyRepository {
  async findById(): Promise<Company | null> {
    return null;
  }
  async findByCode(): Promise<Company | null> {
    return null;
  }
  async save(): Promise<void> {}
}

function buildContext(headers: Record<string, string | undefined>, authContext: unknown) {
  const request: Record<string, unknown> = {
    correlationId: "correlation-1",
    authContext,
    header: (name: string) => headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext & { __request: typeof request };
}

describe("TenantContextGuard", () => {
  async function buildGuard() {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(
      Tenant.create({
        id: "tenant-a",
        slug: "tenant-a",
        name: "Tenant A",
        status: "ACTIVE",
        version: 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await memberships.save(
      Membership.create({
        id: "membership-1",
        tenantId: "tenant-a",
        userId: "user-1",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
    );
    const resolveTenantContext = new ResolveTenantContextUseCase(
      tenants,
      memberships,
      new StubCompanyRepository(),
    );
    return new TenantContextGuard(resolveTenantContext);
  }

  it("attaches the resolved tenant context to the request and allows the request through", async () => {
    const guard = await buildGuard();
    const context = buildContext({ [TENANT_SLUG_HEADER]: "tenant-a" }, { user: { id: "user-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest() as { tenantContext?: { tenantId: string } };
    expect(request.tenantContext?.tenantId).toBe("tenant-a");
  });

  it("rejects when the tenant slug header is missing", async () => {
    const guard = await buildGuard();
    const context = buildContext({}, { user: { id: "user-1" } });

    await expect(guard.canActivate(context)).rejects.toThrow(AppException);
  });

  it("rejects when SessionAuthGuard has not populated authContext", async () => {
    const guard = await buildGuard();
    const context = buildContext({ [TENANT_SLUG_HEADER]: "tenant-a" }, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(AppException);
  });

  it("maps an unknown tenant slug to a 404-style AppException", async () => {
    const guard = await buildGuard();
    const context = buildContext(
      { [TENANT_SLUG_HEADER]: "does-not-exist" },
      { user: { id: "user-1" } },
    );

    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });
});
