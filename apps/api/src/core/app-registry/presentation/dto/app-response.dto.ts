import { ApiProperty } from "@nestjs/swagger";
import type { AppDefinition } from "../../domain/app-definition.entity";
import type { TenantAppSummary } from "../../application/use-cases/list-tenant-apps.use-case";
import type { AppConfiguration } from "../../domain/app-configuration.entity";

const APP_KIND_VALUES = ["BUSINESS_APP", "CHANNEL", "INTEGRATION", "INDUSTRY_EXTENSION"] as const;
const TENANT_APP_STATUS_VALUES = ["ENABLED", "DISABLED"] as const;

export class AppDefinitionResponseDto {
  @ApiProperty({ example: "manufacturing" }) key!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: "1.0.0" }) version!: string;
  @ApiProperty({ enum: APP_KIND_VALUES }) kind!: string;
  @ApiProperty({ type: [String] }) dependsOnKeys!: string[];

  static fromDomain(definition: AppDefinition): AppDefinitionResponseDto {
    const dto = new AppDefinitionResponseDto();
    dto.key = definition.key;
    dto.name = definition.name;
    dto.version = definition.version;
    dto.kind = definition.kind;
    dto.dependsOnKeys = [...definition.dependsOnKeys];
    return dto;
  }
}

export class TenantAppResponseDto {
  @ApiProperty({ example: "manufacturing" }) key!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: "1.0.0" }) version!: string;
  @ApiProperty({ enum: APP_KIND_VALUES }) kind!: string;
  @ApiProperty({ type: [String] }) dependsOnKeys!: string[];
  @ApiProperty({ enum: TENANT_APP_STATUS_VALUES, description: "This tenant's own enablement state for the app." })
  status!: string;

  static fromDomain(summary: TenantAppSummary): TenantAppResponseDto {
    const dto = new TenantAppResponseDto();
    dto.key = summary.key;
    dto.name = summary.name;
    dto.version = summary.version;
    dto.kind = summary.kind;
    dto.dependsOnKeys = [...summary.dependsOnKeys];
    dto.status = summary.status;
    return dto;
  }
}

export class AppConfigurationResponseDto {
  @ApiProperty() key!: string;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(configuration: AppConfiguration): AppConfigurationResponseDto {
    const dto = new AppConfigurationResponseDto();
    dto.key = configuration.key;
    dto.value = configuration.value;
    dto.updatedAt = configuration.updatedAt.toISOString();
    return dto;
  }
}
