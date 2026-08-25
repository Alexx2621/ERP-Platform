import { Injectable } from "@nestjs/common";
import { Algorithm, hash, verify, type Options } from "@node-rs/argon2";
import { PasswordHasher } from "../application/ports/password-hasher.port";

/**
 * Argon2id per ADR-006 (docs/DECISIONS.md), at the OWASP-recommended baseline
 * (m=19456 KiB, t=2, p=1). These happen to be @node-rs/argon2's own defaults;
 * they are still spelled out explicitly so the security parameter is visible
 * in source rather than resting on a dependency's default never changing.
 */
const ARGON2_OPTIONS: Options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  verify(encodedHash: string, plainPassword: string): Promise<boolean> {
    return verify(encodedHash, plainPassword);
  }
}
