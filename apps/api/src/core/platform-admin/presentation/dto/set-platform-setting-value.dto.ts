import { ApiProperty } from "@nestjs/swagger";
import { IsDefined } from "class-validator";

export class SetPlatformSettingValueDto {
  @ApiProperty({
    type: Object,
    description: "Must match the setting definition's declared data type.",
  })
  @IsDefined()
  value!: unknown;
}
