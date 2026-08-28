import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MaxLength } from "class-validator";

export class InviteMembershipDto {
  @ApiProperty({ example: "new-member@example.com", maxLength: 320, description: "Must belong to an existing user account." })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
