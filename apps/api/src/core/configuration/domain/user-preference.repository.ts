import type { UserPreference } from "./user-preference.entity";

export const USER_PREFERENCE_REPOSITORY = Symbol("USER_PREFERENCE_REPOSITORY");

export interface UserPreferenceRepository {
  findByUserAndKey(userId: string, key: string): Promise<UserPreference | null>;
  findByUser(userId: string): Promise<UserPreference[]>;
  save(preference: UserPreference): Promise<void>;
}
