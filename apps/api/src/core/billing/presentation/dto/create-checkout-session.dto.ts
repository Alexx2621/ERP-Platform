import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl, MinLength } from "class-validator";

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: "profesional" })
  @IsString()
  @MinLength(1)
  planKey!: string;

  @ApiProperty({ example: "https://app.example.com/billing/success" })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({ example: "https://app.example.com/billing/cancelled" })
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty() checkoutUrl!: string;
}
