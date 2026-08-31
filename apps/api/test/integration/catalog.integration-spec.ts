import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { PrismaUnitOfMeasureRepository } from "../../src/modules/catalog/infrastructure/prisma-unit-of-measure.repository";
import { PrismaCategoryRepository } from "../../src/modules/catalog/infrastructure/prisma-category.repository";
import { PrismaBrandRepository } from "../../src/modules/catalog/infrastructure/prisma-brand.repository";
import { PrismaProductRepository } from "../../src/modules/catalog/infrastructure/prisma-product.repository";
import { PrismaProductVariantRepository } from "../../src/modules/catalog/infrastructure/prisma-product-variant.repository";
import { CreateUnitOfMeasureUseCase } from "../../src/modules/catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateCategoryUseCase } from "../../src/modules/catalog/application/use-cases/create-category.use-case";
import { CreateBrandUseCase } from "../../src/modules/catalog/application/use-cases/create-brand.use-case";
import { CreateProductUseCase } from "../../src/modules/catalog/application/use-cases/create-product.use-case";
import { UpdateProductUseCase } from "../../src/modules/catalog/application/use-cases/update-product.use-case";
import { ListProductsUseCase } from "../../src/modules/catalog/application/use-cases/list-products.use-case";
import { AddProductVariantUseCase } from "../../src/modules/catalog/application/use-cases/add-product-variant.use-case";
import {
  ProductBarcodeAlreadyInUseError,
  ProductCategoryNotFoundError,
  ProductNotFoundError,
  ProductVariantSkuAlreadyInUseError,
} from "../../src/modules/catalog/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Catalog Integration Owner",
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

describe("Catalog module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it("enforces company scoping, real FKs and uniqueness across the whole catalog", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const units = new PrismaUnitOfMeasureRepository(prisma);
    const categories = new PrismaCategoryRepository(prisma);
    const brands = new PrismaBrandRepository(prisma);
    const products = new PrismaProductRepository(prisma);
    const variants = new PrismaProductVariantRepository(prisma);
    const now = new Date("2026-08-31T00:00:00.000Z");

    const owner = createUser(now, "catalog-owner@example.com");
    const tenantA = createTenant(now, "catalog-tenant-a");
    const tenantB = createTenant(now, "catalog-tenant-b");
    await users.save(owner);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const orgA = Organization.create({
      id: newId(),
      tenantId: tenantA.id,
      code: "HQ",
      name: "HQ",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await organizations.save(orgA);
    const companyA1 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "CO1",
      name: "Company One",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const companyA2 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "CO2",
      name: "Company Two",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(companyA1);
    await companies.save(companyA2);

    const createUnit = new CreateUnitOfMeasureUseCase(units);
    const createCategory = new CreateCategoryUseCase(categories);
    const createBrand = new CreateBrandUseCase(brands);
    const createProduct = new CreateProductUseCase(products, units, categories, brands);
    const updateProduct = new UpdateProductUseCase(products, categories, brands);
    const listProducts = new ListProductsUseCase(products);
    const addVariant = new AddProductVariantUseCase(variants, products);

    const unit = await createUnit.execute({ tenantId: tenantA.id, companyId: companyA1.id, code: "UN", name: "Unidad", symbol: "u" });
    const category = await createCategory.execute({ tenantId: tenantA.id, companyId: companyA1.id, code: "CLOTHING", name: "Ropa" });
    const subcategory = await createCategory.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "SHIRTS",
      name: "Camisas",
      parentId: category.id,
    });
    const brand = await createBrand.execute({ tenantId: tenantA.id, companyId: companyA1.id, code: "ACME", name: "Acme" });

    // A category from a different company in the SAME tenant is rejected —
    // the composite (tenantId, id) FK alone would allow it; the application
    // check on companyId is what actually blocks it. Uses a unit of measure
    // that genuinely belongs to companyA2 so the earlier UoM check does not
    // mask the category check being exercised here.
    const unitForCompanyA2 = await createUnit.execute({
      tenantId: tenantA.id,
      companyId: companyA2.id,
      code: "UN",
      name: "Unidad",
      symbol: "u",
    });
    await expect(
      createProduct.execute({
        tenantId: tenantA.id,
        companyId: companyA2.id,
        code: "SKU-CROSS",
        name: "Cross-company product",
        unitOfMeasureId: unitForCompanyA2.id,
        categoryId: category.id,
        basePrice: "10.00",
      }),
    ).rejects.toThrow(ProductCategoryNotFoundError);

    const shirt = await createProduct.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "SHIRT-001",
      name: "Camisa de algodón",
      unitOfMeasureId: unit.id,
      categoryId: subcategory.id,
      brandId: brand.id,
      barcode: "7501234567890",
      hasVariants: true,
    });

    // Real unique index on (tenantId, companyId, barcode) — not just an
    // application-level pre-check.
    await expect(
      createProduct.execute({
        tenantId: tenantA.id,
        companyId: companyA1.id,
        code: "SHIRT-002",
        name: "Otra camisa",
        unitOfMeasureId: unit.id,
        barcode: "7501234567890",
        basePrice: "9.99",
      }),
    ).rejects.toThrow(ProductBarcodeAlreadyInUseError);

    const variant1 = await addVariant.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      productId: shirt.id,
      sku: "SHIRT-001-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.9900",
      cost: "12.0000",
    });
    // assertValidDecimal validates format without normalizing digits — the
    // string is stored and returned exactly as given.
    expect(variant1.price).toBe("24.9900");

    // Real DB round-trip: Postgres numeric(14,4) pads to the declared scale,
    // and the repository's .toFixed(4) must reflect that faithfully rather
    // than Decimal.js's default toString() (which silently strips trailing
    // zeros, e.g. "24.99" instead of "24.9900").
    const reloadedVariant = await variants.findBySku(tenantA.id, "SHIRT-001-BLU-M");
    expect(reloadedVariant?.price).toBe("24.9900");
    expect(reloadedVariant?.cost).toBe("12.0000");

    // Real unique index on (tenantId, sku).
    await expect(
      addVariant.execute({
        tenantId: tenantA.id,
        companyId: companyA1.id,
        productId: shirt.id,
        sku: "SHIRT-001-BLU-M",
        attributes: { color: "Azul", size: "L" },
        price: "24.9900",
      }),
    ).rejects.toThrow(ProductVariantSkuAlreadyInUseError);

    // Cross-tenant isolation: tenant B never sees tenant A's catalog, and a
    // product id from tenant A resolves to nothing for tenant B.
    expect(await listProducts.execute(tenantB.id, companyA1.id)).toEqual([]);
    await expect(
      updateProduct.execute({
        tenantId: tenantB.id,
        companyId: companyA1.id,
        id: shirt.id,
        name: "Hijacked",
        trackInventory: true,
        sellable: true,
        purchasable: true,
        publishOnline: false,
      }),
    ).rejects.toThrow(ProductNotFoundError);

    const listed = await listProducts.execute(tenantA.id, companyA1.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.code).toBe("SHIRT-001");

    // Same real DB round-trip check for a non-variant product's own basePrice/baseCost.
    await createProduct.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "PANTS-001",
      name: "Pantalón",
      unitOfMeasureId: unit.id,
      basePrice: "29.9900",
      baseCost: "15.0000",
    });
    const reloadedPants = await products.findByCode(tenantA.id, companyA1.id, "PANTS-001");
    expect(reloadedPants?.basePrice).toBe("29.9900");
    expect(reloadedPants?.baseCost).toBe("15.0000");
  });
});
