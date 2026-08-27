import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/role.entity";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository) {}

  execute(tenantId: string): Promise<Role[]> {
    return this.roles.findByTenant(tenantId);
  }
}
