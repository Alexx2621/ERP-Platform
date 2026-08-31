import { Product } from "../domain/product.entity";
import { ProductRepository } from "../domain/product.repository";

export class InMemoryProductRepository implements ProductRepository {
  private readonly byId = new Map<string, Product>();

  async findById(tenantId: string, id: string): Promise<Product | null> {
    const product = this.byId.get(id);
    return product && product.tenantId === tenantId ? product : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Product | null> {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.companyId === companyId && p.code === code,
      ) ?? null
    );
  }

  async findByBarcode(tenantId: string, companyId: string, barcode: string): Promise<Product | null> {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.companyId === companyId && p.barcode === barcode,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Product[]> {
    return [...this.byId.values()].filter((p) => p.tenantId === tenantId && p.companyId === companyId);
  }

  async save(product: Product): Promise<void> {
    this.byId.set(product.id, product);
  }
}
