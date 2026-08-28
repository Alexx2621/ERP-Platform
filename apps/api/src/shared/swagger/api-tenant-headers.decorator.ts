import { applyDecorators } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";

/**
 * Documents the two headers `TenantContextGuard` reads (docs/MULTITENANCY.md
 * §6.1) — apply to any endpoint behind that guard, alongside `@ApiBearerAuth`.
 */
export function ApiTenantHeaders(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiHeader({
      name: "X-Tenant-Slug",
      description: "Slug of the tenant to operate in.",
      required: true,
    }),
    ApiHeader({
      name: "X-Company-Id",
      description: "Optional company scope within the tenant.",
      required: false,
    }),
  );
}
