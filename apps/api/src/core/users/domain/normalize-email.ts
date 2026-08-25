/** Canonical form used for storage and lookup, so `Foo@Example.com` and `foo@example.com` are the same identity. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
