import { ApiProperty } from "@nestjs/swagger";
import type { PipelineSummaryResult } from "../../application/use-cases/get-pipeline-summary.use-case";

export class PipelineStageSummaryResponseDto {
  @ApiProperty() stageId!: string;
  @ApiProperty() stageName!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() openCount!: number;
  @ApiProperty({ example: "1500.0000" }) openAmountTotal!: string;
}

export class PipelineSummaryResponseDto {
  @ApiProperty() pipelineId!: string;
  @ApiProperty() pipelineName!: string;
  @ApiProperty({ type: [PipelineStageSummaryResponseDto] }) rows!: PipelineStageSummaryResponseDto[];
  @ApiProperty({ example: "1500.0000" }) totalOpenAmount!: string;

  static fromResult(result: PipelineSummaryResult): PipelineSummaryResponseDto {
    const dto = new PipelineSummaryResponseDto();
    dto.pipelineId = result.pipelineId;
    dto.pipelineName = result.pipelineName;
    dto.rows = result.rows.map((row) => ({ ...row }));
    dto.totalOpenAmount = result.totalOpenAmount;
    return dto;
  }
}
