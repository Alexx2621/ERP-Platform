import { Inject, Injectable } from "@nestjs/common";
import { UserPreference } from "../../domain/user-preference.entity";
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from "../../domain/user-preference.repository";

@Injectable()
export class ListUserPreferencesUseCase {
  constructor(
    @Inject(USER_PREFERENCE_REPOSITORY) private readonly preferences: UserPreferenceRepository,
  ) {}

  execute(userId: string): Promise<UserPreference[]> {
    return this.preferences.findByUser(userId);
  }
}
