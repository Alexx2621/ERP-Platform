import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshDto {
  @ApiProperty({ description: "Refresh token from a prior login/register/refresh response." })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
