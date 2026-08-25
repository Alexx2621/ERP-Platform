/** Generates high-entropy opaque session tokens and their storable hash (ADR-006). */
export interface TokenGenerator {
  /** Cryptographically random opaque token, safe to hand to a client. */
  generateToken(): string;
  /** One-way hash of a token, safe to persist and index. */
  hashToken(token: string): string;
}

export const TOKEN_GENERATOR = Symbol("TOKEN_GENERATOR");
