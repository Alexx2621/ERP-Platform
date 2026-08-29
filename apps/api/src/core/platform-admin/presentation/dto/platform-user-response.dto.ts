import { ApiProperty } from "@nestjs/swagger";
import type { User, UserStatus } from "../../../users";

export class PlatformUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: ["ACTIVE", "DISABLED"] }) status!: UserStatus;
  @ApiProperty() isPlatformAdmin!: boolean;
  @ApiProperty() createdAt!: string;

  static fromDomain(user: User): PlatformUserResponseDto {
    const dto = new PlatformUserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.displayName = user.displayName;
    dto.status = user.status;
    dto.isPlatformAdmin = user.isPlatformAdmin;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}
