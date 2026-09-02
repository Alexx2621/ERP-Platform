import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";
import type { Cart } from "../../domain/cart.entity";
import type { CartLine } from "../../domain/cart-line.entity";

export class AddCartLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() productVariantId?: string | null;
  @ApiProperty({ example: "1.0000" }) @IsNumberString() quantity!: string;
}

export class UpdateCartLineQuantityDto {
  @ApiProperty({ example: "2.0000" }) @IsNumberString() quantity!: string;
}

export class CartLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ nullable: true, type: String }) productVariantId!: string | null;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() subtotal!: string;

  static fromDomain(line: CartLine, subtotal: string): CartLineResponseDto {
    const dto = new CartLineResponseDto();
    dto.id = line.id;
    dto.productId = line.productId;
    dto.productVariantId = line.productVariantId;
    dto.quantity = line.quantity;
    dto.unitPrice = line.unitPrice;
    dto.subtotal = subtotal;
    return dto;
  }
}

export class CartResponseDto {
  @ApiProperty({ description: "This is the cart token a client must keep (e.g. in localStorage) and resend on every subsequent cart/checkout call." })
  id!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: ["OPEN", "CONVERTED"] }) status!: string;
  @ApiProperty({ type: [CartLineResponseDto] }) lines!: CartLineResponseDto[];
  @ApiProperty({ description: "Informational preview only — the authoritative total is computed at checkout." })
  subtotal!: string;

  static fromDomain(cart: Cart, lines: CartLineResponseDto[], subtotal: string): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = cart.id;
    dto.currency = cart.currency;
    dto.status = cart.status;
    dto.lines = lines;
    dto.subtotal = subtotal;
    return dto;
  }
}
