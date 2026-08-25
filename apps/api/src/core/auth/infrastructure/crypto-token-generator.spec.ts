import { CryptoTokenGenerator } from "./crypto-token-generator";

describe("CryptoTokenGenerator", () => {
  const generator = new CryptoTokenGenerator();

  it("generates unique tokens", () => {
    const a = generator.generateToken();
    const b = generator.generateToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hashes the same token to the same value", () => {
    const token = generator.generateToken();
    expect(generator.hashToken(token)).toEqual(generator.hashToken(token));
  });

  it("hashes different tokens to different values", () => {
    const a = generator.generateToken();
    const b = generator.generateToken();
    expect(generator.hashToken(a)).not.toEqual(generator.hashToken(b));
  });
});
