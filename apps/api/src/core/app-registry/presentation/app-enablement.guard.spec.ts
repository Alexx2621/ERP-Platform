import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AppException } from "../../../shared/errors/app.exception";
import { IsAppEnabledForTenantUseCase } from "../application/use-cases/is-app-enabled-for-tenant.use-case";
import { AppEnablementGuard } from "./app-enablement.guard";
import { APP_METADATA_KEY } from "./require-app.decorator";

function buildReflector(appKey: string | undefined): Reflector {
  return { getAllAndOverride: () => appKey } as unknown as Reflector;
}

function buildContext(tenantContext: unknown): ExecutionContext {
  const request = { tenantContext };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe("AppEnablementGuard", () => {
  it("allows the request through when the app is enabled for the tenant", async () => {
    const isAppEnabled = { execute: jest.fn().mockResolvedValue(true) } as unknown as IsAppEnabledForTenantUseCase;
    const guard = new AppEnablementGuard(buildReflector("catalog"), isAppEnabled);
    const context = buildContext({ tenantId: "tenant-a" });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(isAppEnabled.execute).toHaveBeenCalledWith({ tenantId: "tenant-a", key: "catalog" });
  });

  it("rejects with a 403 AppException when the app is not enabled for the tenant", async () => {
    const isAppEnabled = { execute: jest.fn().mockResolvedValue(false) } as unknown as IsAppEnabledForTenantUseCase;
    const guard = new AppEnablementGuard(buildReflector("manufacturing"), isAppEnabled);
    const context = buildContext({ tenantId: "tenant-a" });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: "APP_NOT_ENABLED_FOR_TENANT",
    });
  });

  it("fails closed with a 500 AppException if applied without @RequireApp()", async () => {
    const isAppEnabled = { execute: jest.fn() } as unknown as IsAppEnabledForTenantUseCase;
    const guard = new AppEnablementGuard(buildReflector(undefined), isAppEnabled);
    const context = buildContext({ tenantId: "tenant-a" });

    await expect(guard.canActivate(context)).rejects.toThrow(AppException);
    expect(isAppEnabled.execute).not.toHaveBeenCalled();
  });

  it("fails closed with a 500 AppException if run before TenantContextGuard", async () => {
    const isAppEnabled = { execute: jest.fn() } as unknown as IsAppEnabledForTenantUseCase;
    const guard = new AppEnablementGuard(buildReflector("catalog"), isAppEnabled);
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: "APP_ENABLEMENT_GUARD_REQUIRES_TENANT_CONTEXT",
    });
  });

  it("reads the app key set by @RequireApp() via the shared metadata key", () => {
    expect(APP_METADATA_KEY).toBe("app-registry:app");
  });
});
