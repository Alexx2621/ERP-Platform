import { ApiProperty } from "@nestjs/swagger";
import { IsDefined } from "class-validator";

export class SetAppConfigurationDto {
  @ApiProperty({ type: Object, description: "Any JSON-serializable value." })
  @IsDefined()
  value!: unknown;
}
