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
  {
    key: "audit.entries.read",
    description: "View the tenant's audit trail (provisioning, RBAC and configuration changes).",
  },
  { key: "files.read", description: "View and download the tenant's uploaded files." },
  { key: "files.upload", description: "Upload new files for the tenant." },
  { key: "files.delete", description: "Delete (soft) files uploaded to the tenant." },
  { key: "tenants.memberships.read", description: "View the tenant's member list." },
  {
    key: "tenants.memberships.manage",
    description: "Invite existing users to the tenant as new memberships.",
  },
  { key: "apps.read", description: "View the app catalog and this tenant's own app enablement state." },
  {
    key: "apps.manage",
    description: "Enable or disable apps for the tenant, and set their configuration.",
  },
  { key: "catalog.units-of-measure.read", description: "View the company's units of measure." },
  { key: "catalog.units-of-measure.manage", description: "Create, edit and archive units of measure." },
  { key: "catalog.categories.read", description: "View the company's product categories." },
  { key: "catalog.categories.manage", description: "Create, edit and archive product categories." },
  { key: "catalog.brands.read", description: "View the company's brands." },
  { key: "catalog.brands.manage", description: "Create, edit and archive brands." },
  { key: "catalog.products.read", description: "View the company's products and variants." },
  {
    key: "catalog.products.manage",
    description: "Create, edit and archive products and their variants.",
  },
  { key: "customers.read", description: "View the company's customers." },
  { key: "customers.manage", description: "Create, edit and archive customers." },
  { key: "suppliers.read", description: "View the company's suppliers." },
  { key: "suppliers.manage", description: "Create, edit and archive suppliers." },
  { key: "taxes.read", description: "View the company's taxes." },
  { key: "taxes.manage", description: "Create, edit and archive taxes." },
  { key: "warehouses.read", description: "View the company's warehouses." },
  { key: "warehouses.manage", description: "Create, edit and archive warehouses." },
  { key: "pricing.price-lists.read", description: "View the company's price lists and their items." },
  {
    key: "pricing.price-lists.manage",
    description: "Create, edit and archive price lists and manage their items.",
  },
  { key: "inventory.balances.read", description: "View the company's on-hand/reserved/available inventory balances." },
  { key: "inventory.movements.read", description: "View the company's inventory movement ledger." },
  {
    key: "inventory.movements.manage",
    description: "Post inventory receipts, issues and adjustments.",
  },
  { key: "inventory.reservations.read", description: "View the company's inventory reservations." },
  {
    key: "inventory.reservations.manage",
    description: "Create and release inventory reservations.",
  },
  { key: "inventory.transfers.read", description: "View the company's inventory transfers." },
  {
    key: "inventory.transfers.manage",
    description: "Create, complete and cancel inventory transfers between warehouses.",
  },
  { key: "sales.quotes.read", description: "View the company's quotes and their lines." },
  { key: "sales.quotes.manage", description: "Create, add lines to, convert and cancel quotes." },
  { key: "sales.orders.read", description: "View the company's sales orders and their lines." },
  {
    key: "sales.orders.manage",
    description: "Create, add lines to, confirm, cancel and fulfill sales orders.",
  },
  { key: "sales.returns.read", description: "View the company's sales returns and their lines." },
  { key: "sales.returns.manage", description: "Record sales returns." },
  { key: "payments.read", description: "View the company's payments." },
  { key: "payments.manage", description: "Capture and refund payments." },
  { key: "purchasing.orders.read", description: "View the company's purchase orders and their lines." },
  { key: "purchasing.orders.manage", description: "Create, add lines to, close and cancel purchase orders." },
  {
    key: "purchasing.orders.approve",
    description: "Approve (confirm) a DRAFT purchase order — deliberately distinct from purchasing.orders.manage for segregation of duties.",
  },
  { key: "purchasing.receipts.read", description: "View the company's purchase receipts and their lines." },
  { key: "purchasing.receipts.manage", description: "Record receipts against confirmed purchase orders." },
  { key: "purchasing.returns.read", description: "View the company's returns to suppliers and their lines." },
  { key: "purchasing.returns.manage", description: "Record returns to suppliers." },
  { key: "purchasing.invoices.read", description: "View the company's supplier invoices." },
  { key: "purchasing.invoices.manage", description: "Record and cancel supplier invoices." },
  { key: "pos.registers.read", description: "View the company's POS registers." },
  { key: "pos.registers.manage", description: "Create POS registers and change their status." },
  { key: "pos.shifts.read", description: "View the company's POS shifts." },
  { key: "pos.shifts.manage", description: "Open and close POS shifts." },
  { key: "pos.cash-movements.read", description: "View a POS shift's cash movements." },
  { key: "pos.cash-movements.manage", description: "Record cash-in/cash-out movements against an OPEN shift." },
  { key: "pos.sales.read", description: "View the company's POS sales." },
  { key: "pos.sales.manage", description: "Ring up POS sales." },
  { key: "pos.returns.read", description: "View the company's POS returns." },
  { key: "pos.returns.manage", description: "Record POS returns." },
  { key: "commerce.storefronts.read", description: "View the company's storefronts and their catalog publications." },
  {
    key: "commerce.storefronts.manage",
    description: "Create storefronts, change their status, and publish/unpublish products to them.",
  },
  { key: "commerce.orders.read", description: "View the company's completed online checkouts." },
  { key: "accounting.accounts.read", description: "View the company's Chart of Accounts." },
  { key: "accounting.accounts.manage", description: "Create, rename and activate/deactivate accounts." },
  { key: "accounting.periods.read", description: "View the company's fiscal periods." },
  { key: "accounting.periods.manage", description: "Open and close fiscal periods." },
  { key: "accounting.entries.read", description: "View the company's journal entries and their lines." },
  { key: "accounting.entries.manage", description: "Post and reverse journal entries." },
  { key: "accounting.reports.read", description: "View the company's Trial Balance and account ledgers." },
];
