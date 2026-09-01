import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import type { SupplierInvoice } from "../../domain/supplier-invoice.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const STATUSES = ["RECORDED", "CANCELLED"] as const;

export class CreateSupplierInvoiceDto {
  @ApiProperty() @IsString() @IsNotEmpty() supplierId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() purchaseOrderId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) invoiceNumber!: string;
  @ApiProperty({ example: "1250.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "amount must be a positive decimal string with up to 4 fraction digits." })
  amount!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiProperty({ example: "2026-09-01" }) @IsDateString() issueDate!: string;
  @ApiPropertyOptional({ example: "2026-10-01" }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ListSupplierInvoicesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SupplierInvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty({ example: "1250.0000" }) amount!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ example: "2026-09-01" }) issueDate!: string;
  @ApiProperty({ type: String, nullable: true, example: "2026-10-01" }) dueDate!: string | null;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(invoice: SupplierInvoice): SupplierInvoiceResponseDto {
    const dto = new SupplierInvoiceResponseDto();
    dto.id = invoice.id;
    dto.supplierId = invoice.supplierId;
    dto.purchaseOrderId = invoice.purchaseOrderId;
    dto.invoiceNumber = invoice.invoiceNumber;
    dto.amount = invoice.amount;
    dto.currency = invoice.currency;
    dto.issueDate = invoice.issueDate.toISOString().slice(0, 10);
    dto.dueDate = invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null;
    dto.status = invoice.status;
    dto.notes = invoice.notes;
    dto.createdAt = invoice.createdAt.toISOString();
    dto.updatedAt = invoice.updatedAt.toISOString();
    dto.cancelledAt = invoice.cancelledAt ? invoice.cancelledAt.toISOString() : null;
    return dto;
  }
}
