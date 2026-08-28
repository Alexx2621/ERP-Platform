import { ApiProperty } from "@nestjs/swagger";
import type { Membership, MembershipStatus } from "../../domain/membership.entity";
import type { User } from "../../../users";
import type { PendingInvitation } from "../../application/list-pending-invitations.use-case";

export class MembershipResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"] }) status!: MembershipStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static fromDomain(membership: Membership): MembershipResponseDto {
    const dto = new MembershipResponseDto();
    dto.id = membership.id;
    dto.tenantId = membership.tenantId;
    dto.userId = membership.userId;
    dto.status = membership.status;
    dto.createdAt = membership.createdAt.toISOString();
    dto.updatedAt = membership.updatedAt.toISOString();
    return dto;
  }
}

export class MembershipWithUserResponseDto extends MembershipResponseDto {
  @ApiProperty() email!: string;
  @ApiProperty() displayName!: string;

  static fromDomainWithUser(membership: Membership, user: User): MembershipWithUserResponseDto {
    const dto = new MembershipWithUserResponseDto();
    Object.assign(dto, MembershipResponseDto.fromDomain(membership));
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

  static fromDomain(invitation: PendingInvitation): PendingInvitationResponseDto {
    const dto = new PendingInvitationResponseDto();
    dto.membershipId = invitation.membership.id;
    dto.tenantSlug = invitation.tenantSlug;
    dto.tenantName = invitation.tenantName;
    dto.createdAt = invitation.membership.createdAt.toISOString();
    return dto;
  }
}
