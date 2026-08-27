import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AppException } from "../../../shared/errors/app.exception";
import { HasPermissionUseCase } from "../application/use-cases/has-permission.use-case";
import { PermissionGuard } from "./permission.guard";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator";

function buildReflector(permissionKey: string | undefined): Reflector {
  return { get: () => permissionKey } as unknown as Reflector;
}

function buildContext(tenantContext: unknown): ExecutionContext {
  const request = { tenantContext };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  it("allows the request through when the permission is granted", async () => {
    const hasPermission = { execute: jest.fn().mockResolvedValue(true) } as unknown as HasPermissionUseCase;
    const guard = new PermissionGuard(buildReflector("access.roles.read"), hasPermission);
    const context = buildContext({ tenantId: "tenant-a", membershipId: "membership-1" });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hasPermission.execute).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      companyId: undefined,
      permissionKey: "access.roles.read",
    });
  });

  it("rejects with a 403 AppException when the permission is not granted", async () => {
    const hasPermission = { execute: jest.fn().mockResolvedValue(false) } as unknown as HasPermissionUseCase;
    const guard = new PermissionGuard(buildReflector("access.roles.manage"), hasPermission);
    const context = buildContext({ tenantId: "tenant-a", membershipId: "membership-1" });

    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("fails closed with a 500 AppException if applied without @RequirePermission()", async () => {
    const hasPermission = { execute: jest.fn() } as unknown as HasPermissionUseCase;
    const guard = new PermissionGuard(buildReflector(undefined), hasPermission);
    const context = buildContext({ tenantId: "tenant-a", membershipId: "membership-1" });

    await expect(guard.canActivate(context)).rejects.toThrow(AppException);
    expect(hasPermission.execute).not.toHaveBeenCalled();
  });

  it("fails closed with a 500 AppException if run before TenantContextGuard", async () => {
    const hasPermission = { execute: jest.fn() } as unknown as HasPermissionUseCase;
    const guard = new PermissionGuard(buildReflector("access.roles.read"), hasPermission);
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: "PERMISSION_GUARD_REQUIRES_TENANT_CONTEXT",
    });
  });

  it("reads the permission key set by @RequirePermission() via the shared metadata key", () => {
    expect(PERMISSION_METADATA_KEY).toBe("access-control:permission");
  });
});
