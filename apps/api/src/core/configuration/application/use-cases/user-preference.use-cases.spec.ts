import { InMemoryUserPreferenceRepository } from "../../test-support/in-memory-user-preference.repository";
import { GetUserPreferenceUseCase } from "./get-user-preference.use-case";
import { ListUserPreferencesUseCase } from "./list-user-preferences.use-case";
import { SetUserPreferenceUseCase } from "./set-user-preference.use-case";

describe("User preference use cases", () => {
  it("returns null for a preference that was never set", async () => {
    const preferences = new InMemoryUserPreferenceRepository();
    const getPreference = new GetUserPreferenceUseCase(preferences);

    await expect(getPreference.execute({ userId: "user-1", key: "theme" })).resolves.toBeNull();
  });

  it("sets a preference and later overwrites it in place, keeping the same id", async () => {
    const preferences = new InMemoryUserPreferenceRepository();
    const setPreference = new SetUserPreferenceUseCase(preferences);
    const getPreference = new GetUserPreferenceUseCase(preferences);

    const created = await setPreference.execute({ userId: "user-1", key: "theme", value: "dark" });
    await expect(getPreference.execute({ userId: "user-1", key: "theme" })).resolves.toBe("dark");

    const updated = await setPreference.execute({ userId: "user-1", key: "theme", value: "light" });
    expect(updated.id).toBe(created.id);
    await expect(getPreference.execute({ userId: "user-1", key: "theme" })).resolves.toBe("light");
  });

  it("scopes preferences by user — one user cannot see another's", async () => {
    const preferences = new InMemoryUserPreferenceRepository();
    const setPreference = new SetUserPreferenceUseCase(preferences);
    const getPreference = new GetUserPreferenceUseCase(preferences);
    await setPreference.execute({ userId: "user-1", key: "theme", value: "dark" });

    await expect(getPreference.execute({ userId: "user-2", key: "theme" })).resolves.toBeNull();
  });

  it("lists every preference for a user", async () => {
    const preferences = new InMemoryUserPreferenceRepository();
    const setPreference = new SetUserPreferenceUseCase(preferences);
    const listPreferences = new ListUserPreferencesUseCase(preferences);
    await setPreference.execute({ userId: "user-1", key: "theme", value: "dark" });
    await setPreference.execute({ userId: "user-1", key: "pageSize", value: 25 });

    const result = await listPreferences.execute("user-1");
    expect(result.map((p) => p.key).sort()).toEqual(["pageSize", "theme"]);
  });
});
