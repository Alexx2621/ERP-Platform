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
import { PrismaProductRepository } from "../../src/modules/catalog/infrastructure/prisma-product.repository";
import { CreateUnitOfMeasureUseCase } from "../../src/modules/catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../src/modules/catalog/application/use-cases/create-product.use-case";
import { GetProductUseCase } from "../../src/modules/catalog/application/use-cases/get-product.use-case";
import { InMemoryCategoryRepository } from "../../src/modules/catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../src/modules/catalog/test-support/in-memory-brand.repository";
import { PrismaTaxRepository } from "../../src/modules/taxes/infrastructure/prisma-tax.repository";
import { CreateTaxUseCase } from "../../src/modules/taxes/application/use-cases/create-tax.use-case";
import { TaxCodeAlreadyInUseError } from "../../src/modules/taxes/application/errors";
import { PrismaWarehouseRepository } from "../../src/modules/warehouses/infrastructure/prisma-warehouse.repository";
import { CreateWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/create-warehouse.use-case";
import { UpdateWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/update-warehouse.use-case";
import { WarehouseNotFoundError } from "../../src/modules/warehouses/application/errors";
import { PrismaPriceListRepository } from "../../src/modules/pricing/infrastructure/prisma-price-list.repository";
import { PrismaPriceListItemRepository } from "../../src/modules/pricing/infrastructure/prisma-price-list-item.repository";
import { CreatePriceListUseCase } from "../../src/modules/pricing/application/use-cases/create-price-list.use-case";
import { AddPriceListItemUseCase } from "../../src/modules/pricing/application/use-cases/add-price-list-item.use-case";
import { UpdatePriceListItemUseCase } from "../../src/modules/pricing/application/use-cases/update-price-list-item.use-case";
import { RemovePriceListItemUseCase } from "../../src/modules/pricing/application/use-cases/remove-price-list-item.use-case";
import { ListPriceListItemsUseCase } from "../../src/modules/pricing/application/use-cases/list-price-list-items.use-case";
import {
  PriceListItemAlreadyExistsError,
  PriceListItemProductHasVariantsError,
} from "../../src/modules/pricing/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Pricing/Taxes/Warehouses Integration Owner",
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

describe("Taxes/Warehouses/Pricing modules against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it("enforces company scoping, real uniqueness, and the cross-module Pricing->Catalog dependency", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const units = new PrismaUnitOfMeasureRepository(prisma);
    const products = new PrismaProductRepository(prisma);
    const categories = new InMemoryCategoryRepository();
    const brands = new InMemoryBrandRepository();
    const taxes = new PrismaTaxRepository(prisma);
    const warehouses = new PrismaWarehouseRepository(prisma);
    const priceLists = new PrismaPriceListRepository(prisma);
    const priceListItems = new PrismaPriceListItemRepository(prisma);
    const now = new Date("2026-08-31T00:00:00.000Z");

    const owner = createUser(now, "pricing-taxes-warehouses-owner@example.com");
    const tenantA = createTenant(now, "ptw-tenant-a");
    const tenantB = createTenant(now, "ptw-tenant-b");
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

    // --- Taxes: real DB uniqueness + cross-company allowance ---
    const createTax = new CreateTaxUseCase(taxes);
    await createTax.execute({ tenantId: tenantA.id, companyId: companyA1.id, code: "IVA", name: "IVA", rate: "12.0000" });
    await expect(
      createTax.execute({ tenantId: tenantA.id, companyId: companyA1.id, code: "IVA", name: "Duplicado", rate: "5.0000" }),
    ).rejects.toThrow(TaxCodeAlreadyInUseError);
    await expect(
      createTax.execute({ tenantId: tenantA.id, companyId: companyA2.id, code: "IVA", name: "IVA", rate: "12.0000" }),
    ).resolves.toBeDefined();

    // --- Warehouses: real DB uniqueness + three-state update contract round-trip ---
    const createWarehouse = new CreateWarehouseUseCase(warehouses);
    const updateWarehouse = new UpdateWarehouseUseCase(warehouses);
    const warehouse = await createWarehouse.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "WH-01",
      name: "Bodega Central",
      city: "Ciudad",
    });
    const keptCity = await updateWarehouse.execute({ tenantId: tenantA.id, companyId: companyA1.id, id: warehouse.id, name: "Bodega Central" });
    expect(keptCity.city).toBe("Ciudad");
    const clearedCity = await updateWarehouse.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      id: warehouse.id,
      name: "Bodega Central",
      city: "",
    });
    expect(clearedCity.city).toBeNull();
    await expect(
      updateWarehouse.execute({ tenantId: tenantA.id, companyId: companyA2.id, id: warehouse.id, name: "Hijacked" }),
    ).rejects.toThrow(WarehouseNotFoundError);

    // --- Pricing: real cross-module Product lookup, real DB uniqueness, hard delete ---
    const unit = await new CreateUnitOfMeasureUseCase(units).execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "UN",
      name: "Unidad",
      symbol: "u",
    });
    const createProduct = new CreateProductUseCase(products, units, categories, brands);
    const getProduct = new GetProductUseCase(products);
    const product = await createProduct.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.9900",
    });
    const variantProduct = await createProduct.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "SKU-2",
      name: "Pantalón",
      unitOfMeasureId: unit.id,
      hasVariants: true,
    });

    const createPriceList = new CreatePriceListUseCase(priceLists);
    const addItem = new AddPriceListItemUseCase(priceLists, priceListItems, getProduct);
    const updateItem = new UpdatePriceListItemUseCase(priceLists, priceListItems);
    const removeItem = new RemovePriceListItemUseCase(priceLists, priceListItems);
    const listItems = new ListPriceListItemsUseCase(priceLists, priceListItems);

    const priceList = await createPriceList.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "WHOLESALE",
      name: "Mayoreo",
      currency: "USD",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    });

    // A hasVariants product is rejected — a real Catalog product, looked up
    // through the real cross-module GetProductUseCase, not a fake.
    await expect(
      addItem.execute({ tenantId: tenantA.id, companyId: companyA1.id, priceListId: priceList.id, productId: variantProduct.id, price: "1.0000" }),
    ).rejects.toThrow(PriceListItemProductHasVariantsError);

    const item = await addItem.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      priceListId: priceList.id,
      productId: product.id,
      price: "24.9900",
    });
    // Real DB round-trip decimal formatting, same fix as Catalog's session bug.
    expect(item.price).toBe("24.9900");

    await expect(
      addItem.execute({ tenantId: tenantA.id, companyId: companyA1.id, priceListId: priceList.id, productId: product.id, price: "29.9900" }),
    ).rejects.toThrow(PriceListItemAlreadyExistsError);

    const reprised = await updateItem.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      priceListId: priceList.id,
      itemId: item.id,
      price: "22.5000",
    });
    expect(reprised.price).toBe("22.5000");

    await removeItem.execute({ tenantId: tenantA.id, companyId: companyA1.id, priceListId: priceList.id, itemId: item.id });
    expect(await listItems.execute({ tenantId: tenantA.id, companyId: companyA1.id, priceListId: priceList.id })).toHaveLength(0);

    // Cross-tenant isolation: tenant B never sees any of tenant A's data.
    const priceListForTenantB = await priceLists.findById(tenantB.id, priceList.id);
    expect(priceListForTenantB).toBeNull();
  });
});
