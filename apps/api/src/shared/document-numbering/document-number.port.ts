/**
 * Port for allocating human-readable, per-company document correlatives
 * (`PED-000001`, `COT-000001`).
 *
 * Follows the same token + interface convention every repository in this
 * codebase already uses (`QUOTE_REPOSITORY` and friends): the application
 * layer depends on the interface, production wires the Prisma-backed
 * implementation, and tests wire an in-memory one — so a use case that
 * allocates a number stays testable without a database.
 */
export const DOCUMENT_NUMBER_ALLOCATOR = Symbol("DOCUMENT_NUMBER_ALLOCATOR");

export interface AllocateDocumentNumberInput {
  tenantId: string;
  companyId: string;
  /** Stable key of the sequence, e.g. `"SALES_ORDER"`. */
  documentType: string;
  /** Human-facing prefix of the produced number, e.g. `"PED"`. */
  prefix: string;
}

export interface DocumentNumberAllocator {
  allocate(input: AllocateDocumentNumberInput): Promise<string>;
}

/** `PED` + 42 -> `PED-000042`. Padding is cosmetic; the counter is the truth. */
export function formatDocumentNumber(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(6, "0")}`;
}
