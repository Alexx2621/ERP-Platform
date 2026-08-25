import { Argon2PasswordHasher } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("verifies a password against its own hash", async () => {
    const hash = await hasher.hash("correct horse battery staple");
    await expect(hasher.verify(hash, "correct horse battery staple")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hasher.hash("correct horse battery staple");
    await expect(hasher.verify(hash, "wrong password")).resolves.toBe(false);
  });

  it("produces a different encoded hash each time (random salt)", async () => {
    const [first, second] = await Promise.all([
      hasher.hash("same-password"),
      hasher.hash("same-password"),
    ]);
    expect(first).not.toEqual(second);
  });

  it("encodes the algorithm as argon2id", async () => {
    const hash = await hasher.hash("some-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });
});
