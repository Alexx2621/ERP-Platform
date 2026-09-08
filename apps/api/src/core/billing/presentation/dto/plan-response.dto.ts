import { ApiProperty } from "@nestjs/swagger";
import type { Plan } from "../../domain/plan.entity";

export class PlanResponseDto {
  @ApiProperty({ example: "starter" }) key!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: "GTQ" }) currency!: string;
  @ApiProperty({ example: "299.0000" }) basePriceAmount!: string;
  @ApiProperty({ example: "29.0000", description: "Informational per-seat guidance — never auto-billed." })
  perUserPriceAmount!: string;
  @ApiProperty({ type: [String] }) includesAppKeys!: string[];
  @ApiProperty() isSelfServe!: boolean;

  static fromDomain(plan: Plan): PlanResponseDto {
    const dto = new PlanResponseDto();
    dto.key = plan.key;
    dto.name = plan.name;
    dto.description = plan.description;
    dto.currency = plan.currency;
    dto.basePriceAmount = plan.basePriceAmount;
    dto.perUserPriceAmount = plan.perUserPriceAmount;
    dto.includesAppKeys = [...plan.includesAppKeys];
    dto.isSelfServe = plan.isSelfServe;
    return dto;
  }
}
