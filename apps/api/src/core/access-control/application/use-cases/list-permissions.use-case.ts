import { Inject, Injectable } from "@nestjs/common";
import { Permission } from "../../domain/permission.entity";
import { PERMISSION_REPOSITORY, PermissionRepository } from "../../domain/permission.repository";

@Injectable()
export class ListPermissionsUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository) {}

  execute(): Promise<Permission[]> {
    return this.permissions.findAll();
  }
}
