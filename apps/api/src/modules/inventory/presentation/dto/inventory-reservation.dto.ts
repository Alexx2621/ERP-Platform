import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import type { InventoryReservation } from "../../domain/inventory-reservation.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class ListInventoryReservationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional({ enum: ["ACTIVE", "RELEASED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "RELEASED"])
  status?: "ACTIVE" | "RELEASED";
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CreateReservationDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty({ example: "10.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
  @ApiProperty({ required: false, description: "Free-form — describes what is holding this stock (e.g. a future Sales order id/type)." })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) referenceId?: string;
}

export class InventoryReservationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty({ example: "10.0000" }) quantity!: string;
  @ApiProperty({ enum: ["ACTIVE", "RELEASED"] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) referenceType!: string | null;
  @ApiProperty({ type: String, nullable: true }) referenceId!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) releasedAt!: string | null;

  static fromDomain(reservation: InventoryReservation): InventoryReservationResponseDto {
    const dto = new InventoryReservationResponseDto();
    dto.id = reservation.id;
    dto.warehouseId = reservation.warehouseId;
    dto.productId = reservation.productId;
    dto.productVariantId = reservation.productVariantId;
    dto.quantity = reservation.quantity;
    dto.status = reservation.status;
    dto.referenceType = reservation.referenceType;
    dto.referenceId = reservation.referenceId;
    dto.version = reservation.version;
    dto.createdAt = reservation.createdAt.toISOString();
    dto.releasedAt = reservation.releasedAt ? reservation.releasedAt.toISOString() : null;
    return dto;
  }
}
