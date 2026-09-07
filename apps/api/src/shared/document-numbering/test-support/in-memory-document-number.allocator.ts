import {
  AllocateDocumentNumberInput,
  DocumentNumberAllocator,
  formatDocumentNumber,
} from "../document-number.port";

/**
 * In-memory {@link DocumentNumberAllocator} for unit tests, mirroring the
 * per-`(tenant, company, documentType)` counter semantics of the real
 * Prisma-backed service without needing a database.
 */
export class InMemoryDocumentNumberAllocator implements DocumentNumberAllocator {
  private readonly counters = new Map<string, number>();

  async allocate(input: AllocateDocumentNumberInput): Promise<string> {
    const key = `${input.tenantId}|${input.companyId}|${input.documentType}`;
    const nextValue = this.counters.get(key) ?? 1;
    this.counters.set(key, nextValue + 1);
    return formatDocumentNumber(input.prefix, nextValue);
  }
}
