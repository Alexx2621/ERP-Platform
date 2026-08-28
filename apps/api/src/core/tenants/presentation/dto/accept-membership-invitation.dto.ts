import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AcceptMembershipInvitationDto {
  @ApiProperty({
    example: "acme",
    description: "The tenant's slug — the caller has no resolvable tenant context yet, so it cannot come from X-Tenant-Slug/TenantContextGuard.",
  })
  @IsString()
  @MinLength(1)
  tenantSlug!: string;
}
