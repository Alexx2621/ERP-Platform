import { UserPreference } from "../domain/user-preference.entity";
import { UserPreferenceRepository } from "../domain/user-preference.repository";

export class InMemoryUserPreferenceRepository implements UserPreferenceRepository {
  private readonly byId = new Map<string, UserPreference>();

  async findByUserAndKey(userId: string, key: string): Promise<UserPreference | null> {
    for (const preference of this.byId.values()) {
      if (preference.userId === userId && preference.key === key) return preference;
    }
    return null;
  }

  async findByUser(userId: string): Promise<UserPreference[]> {
    return [...this.byId.values()].filter((p) => p.userId === userId);
  }

  async save(preference: UserPreference): Promise<void> {
    this.byId.set(preference.id, preference);
  }
}
