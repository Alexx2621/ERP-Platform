export interface PermissionDefinition {
  key: string;
  description: string;
}

/**
 * Code-owned permission catalog (docs/MULTITENANCY.md §9.1: "No se crean
 * permisos arbitrarios desde UI"). Seeded idempotently by
 * PermissionCatalogSeeder. Scoped for now to what this module itself
 * enforces; future modules (Products, Sales, ...) add their own
 * definitions here as they gain real endpoints — this list is
 * deliberately not speculative.
 */
export const FOUNDATION_PERMISSIONS: readonly PermissionDefinition[] = [
  { key: "access.roles.read", description: "View roles and their permissions within a tenant." },
  {
    key: "access.roles.manage",
    description: "Create roles and assign them to memberships within a tenant.",
  },
  { key: "access.permissions.read", description: "View the global permission catalog." },
  {
    key: "configuration.settings.read",
    description: "View the setting catalog and effective settings for a tenant/company.",
  },
  {
    key: "configuration.settings.manage",
    description: "Set TENANT- or COMPANY-scoped setting values.",
  },
];
