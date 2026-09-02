import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { CommerceOrder } from "../../domain/commerce-order.entity";

export class ListCommerceOrdersQueryDto {
  @IsOptional() @IsString() storefrontId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class CommerceOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() storefrontId!: string;
  @ApiProperty() cartId!: string;
  @ApiProperty() salesOrderId!: string;
  @ApiProperty({ nullable: true, type: String }) paymentId!: string | null;
  @ApiProperty() customerId!: string;
  @ApiProperty() guestEmail!: string;
  @ApiProperty() total!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(order: CommerceOrder): CommerceOrderResponseDto {
    const dto = new CommerceOrderResponseDto();
    dto.id = order.id;
    dto.storefrontId = order.storefrontId;
    dto.cartId = order.cartId;
    dto.salesOrderId = order.salesOrderId;
    dto.paymentId = order.paymentId;
    dto.customerId = order.customerId;
    dto.guestEmail = order.guestEmail;
    dto.total = order.total;
    dto.currency = order.currency;
    dto.createdAt = order.createdAt.toISOString();
    return dto;
  }
}
