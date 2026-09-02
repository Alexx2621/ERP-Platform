import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CheckoutDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) guestName!: string;
  @ApiProperty() @IsEmail() guestEmail!: string;

  @ApiPropertyOptional({
    description:
      "Bank transfer confirmation reference. If provided, payment is captured immediately (BANK_TRANSFER). If omitted, the order is placed unpaid and a staff member captures payment later from the order's own screen — see docs/DECISIONS.md ADR-011.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}
