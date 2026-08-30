import { ApiProperty } from "@nestjs/swagger";
import type { Membership, MembershipStatus } from "../../domain/membership.entity";
import type { User } from "../../../users";
import type { PendingInvitation } from "../../application/list-pending-invitations.use-case";

/** `null` unless the membership is INVITED — expiry only means something for a pending invitation. */
function expiresAtFor(membership: Membership, invitationTtlSeconds?: number): string | null {
  if (membership.status !== "INVITED" || invitationTtlSeconds === undefined) return null;
  return new Date(membership.updatedAt.getTime() + invitationTtlSeconds * 1000).toISOString();
}

export class MembershipResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"] }) status!: MembershipStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: "When a pending invitation stops being acceptable. Null for any other status.",
  })
  expiresAt!: string | null;

  static fromDomain(membership: Membership, invitationTtlSeconds?: number): MembershipResponseDto {
    const dto = new MembershipResponseDto();
    dto.id = membership.id;
    dto.tenantId = membership.tenantId;
    dto.userId = membership.userId;
    dto.status = membership.status;
    dto.createdAt = membership.createdAt.toISOString();
    dto.updatedAt = membership.updatedAt.toISOString();
    dto.expiresAt = expiresAtFor(membership, invitationTtlSeconds);
    return dto;
  }
}

export class MembershipWithUserResponseDto extends MembershipResponseDto {
  @ApiProperty() email!: string;
  @ApiProperty() displayName!: string;

  static fromDomainWithUser(
    membership: Membership,
    user: User,
    invitationTtlSeconds?: number,
  ): MembershipWithUserResponseDto {
    const dto = new MembershipWithUserResponseDto();
    Object.assign(dto, MembershipResponseDto.fromDomain(membership, invitationTtlSeconds));
    dto.email = user.email;
    dto.displayName = user.displayName;
    return dto;
  }
}

export class PendingInvitationResponseDto {
  @ApiProperty() membershipId!: string;
  @ApiProperty() tenantSlug!: string;
  @ApiProperty() tenantName!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() expiresAt!: string;

  static fromDomain(invitation: PendingInvitation, invitationTtlSeconds: number): PendingInvitationResponseDto {
    const dto = new PendingInvitationResponseDto();
    dto.membershipId = invitation.membership.id;
    dto.tenantSlug = invitation.tenantSlug;
    dto.tenantName = invitation.tenantName;
    dto.createdAt = invitation.membership.createdAt.toISOString();
    dto.expiresAt = expiresAtFor(invitation.membership, invitationTtlSeconds) as string;
    return dto;
  }
}
