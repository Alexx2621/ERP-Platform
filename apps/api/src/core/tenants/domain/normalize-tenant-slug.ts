const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export class InvalidTenantSlugError extends Error {
  constructor(slug: string) {
    super(`Tenant slug "${slug}" must contain 3-63 lowercase letters, digits, or hyphens.`);
    this.name = "InvalidTenantSlugError";
  }
}

export function normalizeTenantSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!TENANT_SLUG_PATTERN.test(slug)) throw new InvalidTenantSlugError(value);
  return slug;
}
