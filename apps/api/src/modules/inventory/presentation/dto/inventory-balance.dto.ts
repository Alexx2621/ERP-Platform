import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import type { InventoryBalance } from "../../domain/inventory-balance.entity";

export class ListInventoryBalancesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional({ description: "Narrows to one specific variant." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
}

export class InventoryBalanceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty({ example: "125.0000" }) onHandQuantity!: string;
  @ApiProperty({ example: "20.0000" }) reservedQuantity!: string;
  @ApiProperty({ example: "105.0000", description: "onHandQuantity - reservedQuantity, always computed." })
  availableQuantity!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(balance: InventoryBalance): InventoryBalanceResponseDto {
    const dto = new InventoryBalanceResponseDto();
    dto.id = balance.id;
    dto.warehouseId = balance.warehouseId;
    dto.productId = balance.productId;
    dto.productVariantId = balance.productVariantId;
    dto.onHandQuantity = balance.onHandQuantity;
    dto.reservedQuantity = balance.reservedQuantity;
    dto.availableQuantity = balance.availableQuantity;
    dto.version = balance.version;
    dto.createdAt = balance.createdAt.toISOString();
    dto.updatedAt = balance.updatedAt.toISOString();
    return dto;
  }
}
