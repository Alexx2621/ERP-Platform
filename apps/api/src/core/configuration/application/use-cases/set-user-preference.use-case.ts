import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { UserPreference } from "../../domain/user-preference.entity";
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from "../../domain/user-preference.repository";

export interface SetUserPreferenceInput {
  userId: string;
  key: string;
  value: unknown;
}

@Injectable()
export class SetUserPreferenceUseCase {
  constructor(
    @Inject(USER_PREFERENCE_REPOSITORY) private readonly preferences: UserPreferenceRepository,
  ) {}

  async execute(input: SetUserPreferenceInput): Promise<UserPreference> {
    const existing = await this.preferences.findByUserAndKey(input.userId, input.key);
    const now = new Date();
    const preference = UserPreference.create({
      id: existing?.id ?? newId(),
      userId: input.userId,
      key: input.key,
      value: input.value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.preferences.save(preference);
    return preference;
  }
}
