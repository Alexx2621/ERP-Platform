import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AccessControlModule } from "./access-control.module";
import { CreateRoleUseCase } from "./application/use-cases/create-role.use-case";
import { AssignRoleUseCase } from "./application/use-cases/assign-role.use-case";
import { ListRolesUseCase } from "./application/use-cases/list-roles.use-case";
import { ListPermissionsUseCase } from "./application/use-cases/list-permissions.use-case";
import { HasPermissionUseCase } from "./application/use-cases/has-permission.use-case";
import { SeedOwnerRoleUseCase } from "./application/use-cases/seed-owner-role.use-case";
import { PermissionGuard } from "./presentation/permission.guard";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubInfraModule {}

describe("AccessControlModule wiring", () => {
  it("resolves every exported use case and the permission guard with zero dependency on TenantsModule", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubInfraModule, AccessControlModule],
    }).compile();

    expect(moduleRef.get(CreateRoleUseCase)).toBeInstanceOf(CreateRoleUseCase);
    expect(moduleRef.get(AssignRoleUseCase)).toBeInstanceOf(AssignRoleUseCase);
    expect(moduleRef.get(ListRolesUseCase)).toBeInstanceOf(ListRolesUseCase);
    expect(moduleRef.get(ListPermissionsUseCase)).toBeInstanceOf(ListPermissionsUseCase);
    expect(moduleRef.get(HasPermissionUseCase)).toBeInstanceOf(HasPermissionUseCase);
    expect(moduleRef.get(SeedOwnerRoleUseCase)).toBeInstanceOf(SeedOwnerRoleUseCase);
    expect(moduleRef.get(PermissionGuard)).toBeInstanceOf(PermissionGuard);

    await moduleRef.close();
  });
});
