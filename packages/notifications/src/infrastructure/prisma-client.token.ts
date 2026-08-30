/**
 * DI token for the `PrismaClient` this package's Prisma-backed repositories
 * need. Deliberately not tied to any app's own `PrismaService` class — each
 * consuming app (`apps/api`, `apps/worker`) provides its own Nest
 * lifecycle-managed Prisma service under this token (typically via
 * `useExisting`), keeping this package decoupled from a specific app's
 * infrastructure wiring. Mirrors `@erp/events`'s own token — kept separate
 * (not reused) so this package has no dependency on `@erp/events`.
 */
export const PRISMA_CLIENT = Symbol("NOTIFICATIONS_PRISMA_CLIENT");
