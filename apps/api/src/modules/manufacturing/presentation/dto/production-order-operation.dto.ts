import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { ProductionOrderOperation } from "../../domain/production-order-operation.entity";

export class AddProductionOrderOperationDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class ProductionOrderOperationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productionOrderId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) completedAt!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(operation: ProductionOrderOperation): ProductionOrderOperationResponseDto {
    const dto = new ProductionOrderOperationResponseDto();
    dto.id = operation.id;
    dto.productionOrderId = operation.productionOrderId;
    dto.name = operation.name;
    dto.sortOrder = operation.sortOrder;
    dto.completedAt = operation.completedAt ? operation.completedAt.toISOString() : null;
    dto.createdAt = operation.createdAt.toISOString();
    return dto;
  }
}
