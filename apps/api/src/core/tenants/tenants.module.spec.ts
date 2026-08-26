import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { ProvisionTenantUseCase } from "./application/provision-tenant.use-case";
import { ResolveTenantContextUseCase } from "./application/resolve-tenant-context.use-case";
import { TenantsModule } from "./tenants.module";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubPrismaModule {}

describe("TenantsModule wiring", () => {
  it("resolves provisioning and tenant-context use cases", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubPrismaModule, TenantsModule],
    }).compile();

    expect(moduleRef.get(ProvisionTenantUseCase)).toBeInstanceOf(ProvisionTenantUseCase);
    expect(moduleRef.get(ResolveTenantContextUseCase)).toBeInstanceOf(ResolveTenantContextUseCase);

    await moduleRef.close();
  });
});
