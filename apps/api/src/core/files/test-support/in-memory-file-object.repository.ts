import { FileObject } from "../domain/file-object.entity";
import { FileObjectRepository, FindFilesQuery } from "../domain/file-object.repository";

export class InMemoryFileObjectRepository implements FileObjectRepository {
  private readonly rows = new Map<string, FileObject>();

  async save(file: FileObject): Promise<void> {
    this.rows.set(file.id, file);
  }

  async findById(id: string): Promise<FileObject | null> {
    return this.rows.get(id) ?? null;
  }

  async findByTenant(query: FindFilesQuery): Promise<FileObject[]> {
    return [...this.rows.values()]
      .filter((file) => file.tenantId === query.tenantId && file.status === "ACTIVE")
      .filter((file) => query.companyId === undefined || file.companyId === query.companyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, query.limit);
  }

  seed(file: FileObject): void {
    this.rows.set(file.id, file);
  }

  all(): FileObject[] {
    return [...this.rows.values()];
  }
}
