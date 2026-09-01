import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import type { PosCashMovement } from "../../domain/pos-cash-movement.entity";

const TYPES = ["CASH_IN", "CASH_OUT"] as const;
const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class RecordCashMovementDto {
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: (typeof TYPES)[number];
  @ApiProperty({ example: "20.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "amount must be a positive decimal string with up to 4 fraction digits." })
  amount!: string;
  @ApiProperty({ example: "Fondo de cambio" }) @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class PosCashMovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() shiftId!: string;
  @ApiProperty({ enum: TYPES }) type!: string;
  @ApiProperty({ example: "20.0000" }) amount!: string;
  @ApiProperty() reason!: string;
  @ApiProperty() recordedByUserId!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(movement: PosCashMovement): PosCashMovementResponseDto {
    const dto = new PosCashMovementResponseDto();
    dto.id = movement.id;
    dto.shiftId = movement.shiftId;
    dto.type = movement.type;
    dto.amount = movement.amount;
    dto.reason = movement.reason;
    dto.recordedByUserId = movement.recordedByUserId;
    dto.createdAt = movement.createdAt.toISOString();
    return dto;
  }
}
