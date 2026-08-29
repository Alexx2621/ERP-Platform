import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { UserStatus } from "../../../users";

export class SetPlatformUserStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "DISABLED"] })
  @IsIn(["ACTIVE", "DISABLED"])
  status!: UserStatus;
}
