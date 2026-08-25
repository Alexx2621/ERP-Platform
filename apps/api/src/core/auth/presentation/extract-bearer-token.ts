const BEARER_PREFIX = "Bearer ";

/** Returns the raw token from an `Authorization: Bearer <token>` header, or null if absent/malformed. */
export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}
