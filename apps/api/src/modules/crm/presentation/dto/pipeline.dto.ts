import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { Pipeline } from "../../domain/pipeline.entity";
import type { PipelineStage } from "../../domain/pipeline-stage.entity";

export class CreatePipelineDto {
  @ApiProperty({ example: "SALES" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Sales Pipeline" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class SetPipelineStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class AddPipelineStageDto {
  @ApiProperty({ example: "Qualification" }) @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() isWon?: boolean;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() isLost?: boolean;
}

export class PipelineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(pipeline: Pipeline): PipelineResponseDto {
    const dto = new PipelineResponseDto();
    dto.id = pipeline.id;
    dto.code = pipeline.code;
    dto.name = pipeline.name;
    dto.status = pipeline.status;
    dto.createdAt = pipeline.createdAt.toISOString();
    dto.updatedAt = pipeline.updatedAt.toISOString();
    return dto;
  }
}

export class PipelineStageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() pipelineId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isWon!: boolean;
  @ApiProperty() isLost!: boolean;

  static fromDomain(stage: PipelineStage): PipelineStageResponseDto {
    const dto = new PipelineStageResponseDto();
    dto.id = stage.id;
    dto.pipelineId = stage.pipelineId;
    dto.name = stage.name;
    dto.sortOrder = stage.sortOrder;
    dto.isWon = stage.isWon;
    dto.isLost = stage.isLost;
    return dto;
  }
}
