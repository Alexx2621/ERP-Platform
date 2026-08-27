import { Inject, Injectable } from "@nestjs/common";
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from "../../domain/user-preference.repository";

export interface GetUserPreferenceInput {
  userId: string;
  key: string;
}

@Injectable()
export class GetUserPreferenceUseCase {
  constructor(
    @Inject(USER_PREFERENCE_REPOSITORY) private readonly preferences: UserPreferenceRepository,
  ) {}

  async execute(input: GetUserPreferenceInput): Promise<unknown> {
    const preference = await this.preferences.findByUserAndKey(input.userId, input.key);
    return preference?.value ?? null;
  }
}
