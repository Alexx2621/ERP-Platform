import { uuidv7 } from "uuidv7";

/**
 * Generates a time-ordered UUIDv7 for use as a primary key.
 *
 * IDs are generated in application code (not via a Postgres default) so ID
 * generation stays portable and testable, per docs/ARCHITECTURE.md §8.1.
 */
export function newId(): string {
  return uuidv7();
}
