import { IsDefined } from "class-validator";

export class SetPreferenceDto {
  @IsDefined()
  value!: unknown;
}
