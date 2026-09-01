import { ApiClient, ApiError } from "./api-client.js";
import { describe, expect, it, vi } from "vitest";

const session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshExpiresAt: "2099-01-02T00:00:00.000Z",
  user: { id: "user-1", email: "ana@example.com", displayName: "Ana", isPlatformAdmin: false },
};

describe("ApiClient", () => {
  it("sends the login payload to the versioned API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(session), { status: 200 }));
    const client = new ApiClient({
      baseUrl: "https://api.example.test/api/v1/",
      fetch: fetchMock,
    });

    await expect(
      client.login({ email: "ana@example.com", password: "Password1" }),
    ).resolves.toEqual(session);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ana@example.com", password: "Password1" }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get("Content-Type")).toBe("application/json");
  });

  it("adds bearer and tenant context headers", async () => {
    const context = {
      tenantId: "tenant-1",
      membershipId: "membership-1",
      companyId: "company-1",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(context), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.getTenantContext("access-token", "grupo-aurora", "company-1");

    const request = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(request?.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
    expect(headers.get("X-Company-Id")).toBe("company-1");
  });

  it("uses the documented tenant-scoped RBAC endpoints", async () => {
    const createdRole = {
      id: "role-1",
      name: "Supervisor",
      isSystem: false,
      permissionKeys: ["access.roles.read"],
    };
    const assignment = {
      id: "assignment-1",
      membershipId: "membership-1",
      roleId: "role-1",
      scopeType: "COMPANY",
      scopeId: "company-1",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([createdRole]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(createdRole), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(assignment), { status: 201 }));
    const client = new ApiClient({ fetch: fetchMock });

    await expect(client.listRoles("access-token", "grupo-aurora")).resolves.toEqual([createdRole]);
    await client.createRole("access-token", "grupo-aurora", {
      name: "Supervisor",
      permissionKeys: ["access.roles.read"],
    });
    await client.assignRole("access-token", "grupo-aurora", "role/encoded", {
      membershipId: "membership-1",
      scopeType: "COMPANY",
      scopeId: "company-1",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/roles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Supervisor",
          permissionKeys: ["access.roles.read"],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/roles/role%2Fencoded/assignments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          membershipId: "membership-1",
          scopeType: "COMPANY",
          scopeId: "company-1",
        }),
      }),
    );
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("Authorization")).toBe("Bearer access-token");
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
    }
  });

  it("lists the permission catalog with tenant context", async () => {
    const permissions = [
      { key: "access.roles.read", description: "List roles in the active tenant." },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(permissions), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });

    await expect(client.listPermissions("access-token", "grupo-aurora")).resolves.toEqual(
      permissions,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/permissions",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses the documented Settings and Preferences endpoints", async () => {
    const definition = {
      key: "localization.locale",
      dataType: "STRING",
      description: "BCP 47 language tag.",
      defaultValue: "en",
      allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
    };
    const effective = { key: definition.key, value: "es-GT", source: "COMPANY" };
    const settingValue = {
      key: definition.key,
      scopeType: "COMPANY",
      companyId: "company-1",
      value: "es-GT",
      updatedAt: "2026-08-27T12:00:00.000Z",
    };
    const preference = {
      key: "ui.theme",
      value: "dark",
      updatedAt: "2026-08-27T12:00:00.000Z",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([definition]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([effective]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(settingValue), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([preference]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(preference), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listSettingDefinitions("access-token", "grupo-aurora");
    await client.listEffectiveSettings("access-token", "grupo-aurora", "company-1");
    await client.setSettingValue("access-token", "grupo-aurora", "localization/locale", {
      scopeType: "COMPANY",
      companyId: "company-1",
      value: "es-GT",
    });
    await client.listUserPreferences("access-token");
    await client.setUserPreference("access-token", "ui/theme", "dark");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/settings",
      expect.objectContaining({ method: "GET" }),
    );
    const effectiveHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(effectiveHeaders.get("X-Tenant-Slug")).toBe("grupo-aurora");
    expect(effectiveHeaders.get("X-Company-Id")).toBe("company-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/settings/localization%2Flocale",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          scopeType: "COMPANY",
          companyId: "company-1",
          value: "es-GT",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/preferences/ui%2Ftheme",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ value: "dark" }) }),
    );
    for (const callIndex of [3, 4]) {
      const headers = new Headers(fetchMock.mock.calls[callIndex]?.[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBeNull();
      expect(headers.get("Authorization")).toBe("Bearer access-token");
    }
  });

  it("uses the documented membership invitation endpoints", async () => {
    const invited = {
      id: "membership-1",
      tenantId: "tenant-1",
      userId: "user-2",
      status: "INVITED",
      createdAt: "2026-08-28T12:00:00.000Z",
      updatedAt: "2026-08-28T12:00:00.000Z",
      expiresAt: "2026-09-04T12:00:00.000Z",
      email: "nuevo@example.com",
      displayName: "Nuevo",
    };
    const pending = {
      membershipId: "membership-2",
      tenantSlug: "grupo-aurora",
      tenantName: "Grupo Aurora",
      createdAt: "2026-08-28T12:00:00.000Z",
      expiresAt: "2026-09-04T12:00:00.000Z",
    };
    const accepted = { ...invited, status: "ACTIVE", expiresAt: null };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(invited), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([invited]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([pending]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(accepted), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.inviteMembership("access-token", "grupo-aurora", { email: "nuevo@example.com" });
    await client.listMemberships("access-token", "grupo-aurora");
    await client.listPendingInvitations("access-token");
    await client.acceptMembershipInvitation("access-token", "membership-2", { tenantSlug: "grupo-aurora" });
    await client.revokeMembershipInvitation("access-token", "grupo-aurora", "membership-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/tenants/memberships",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "nuevo@example.com" }),
      }),
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("X-Tenant-Slug")).toBe("grupo-aurora");

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/tenants/memberships/pending",
      expect.objectContaining({ method: "GET" }),
    );
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("X-Tenant-Slug")).toBeNull();

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/tenants/memberships/membership-2/accept",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tenantSlug: "grupo-aurora" }),
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/tenants/memberships/membership-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(new Headers(fetchMock.mock.calls[4]?.[1]?.headers).get("X-Tenant-Slug")).toBe("grupo-aurora");
  });

  it("uses the documented platform-administration endpoints", async () => {
    const platformUser = {
      id: "user-2",
      email: "target@example.com",
      displayName: "Target",
      status: "ACTIVE",
      isPlatformAdmin: false,
      createdAt: "2026-08-29T12:00:00.000Z",
    };
    const disabledUser = { ...platformUser, status: "DISABLED" };
    const definition = {
      key: "localization.currency",
      dataType: "STRING",
      description: "x",
      defaultValue: "USD",
      allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
    };
    const platformSetting = { key: "localization.currency", value: "USD", source: "DEFAULT" };
    const platformSettingValue = {
      key: "localization.currency",
      value: "EUR",
      updatedAt: "2026-08-29T12:00:00.000Z",
    };
    const auditEntry = {
      id: "entry-1",
      userId: "user-1",
      tenantId: null,
      companyId: null,
      action: "auth.login.succeeded",
      resource: "Session",
      resourceId: null,
      previousValues: null,
      newValues: null,
      ipAddress: null,
      userAgent: null,
      correlationId: "corr-1",
      createdAt: "2026-08-29T12:00:00.000Z",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([platformUser]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(disabledUser), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([definition]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([platformSetting]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(platformSettingValue), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([auditEntry]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([auditEntry]), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listPlatformUsers("access-token", 10);
    await client.setPlatformUserStatus("access-token", "user-2", { status: "DISABLED" });
    await client.listPlatformSettingDefinitions("access-token");
    await client.listPlatformSettings("access-token");
    await client.setPlatformSettingValue("access-token", "localization.currency", { value: "EUR" });
    await client.listPlatformAuditEntries("access-token");
    await client.listAuditEntries("access-token", "grupo-aurora");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/platform/users?limit=10",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/platform/users/user-2/status",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "DISABLED" }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/platform/settings/localization.currency",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ value: "EUR" }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/v1/platform/audit-entries",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/v1/audit-entries",
      expect.objectContaining({ method: "GET" }),
    );
    expect(new Headers(fetchMock.mock.calls[6]?.[1]?.headers).get("X-Tenant-Slug")).toBe("grupo-aurora");
    expect(new Headers(fetchMock.mock.calls[5]?.[1]?.headers).get("X-Tenant-Slug")).toBeNull();
  });

  it("uses the documented App Registry endpoints", async () => {
    const definition = {
      key: "manufacturing",
      name: "Manufacturing",
      version: "1.0.0",
      kind: "BUSINESS_APP",
      dependsOnKeys: ["products"],
    };
    const tenantApp = { ...definition, status: "ENABLED" };
    const configuration = { key: "default_warehouse", value: "wh-1", updatedAt: "2026-08-30T12:00:00.000Z" };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([definition]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([tenantApp]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(tenantApp), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...tenantApp, status: "DISABLED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([configuration]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(configuration), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listAppDefinitions("access-token", "grupo-aurora");
    await client.listTenantApps("access-token", "grupo-aurora");
    await client.enableApp("access-token", "grupo-aurora", "manufacturing");
    await client.disableApp("access-token", "grupo-aurora", "manufacturing");
    await client.listAppConfiguration("access-token", "grupo-aurora", "manufacturing");
    await client.setAppConfiguration("access-token", "grupo-aurora", "manufacturing", "default_warehouse", {
      value: "wh-1",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/apps/definitions",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/apps", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/apps/manufacturing/enable",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/apps/manufacturing/disable",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/apps/manufacturing/configuration",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/v1/apps/manufacturing/configuration/default_warehouse",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ value: "wh-1" }) }),
    );
    for (const call of fetchMock.mock.calls) {
      expect(new Headers(call[1]?.headers).get("X-Tenant-Slug")).toBe("grupo-aurora");
    }
  });

  it("uses the documented Catalog endpoints, including the company header", async () => {
    const unit = { id: "u1", code: "UN", name: "Unidad", symbol: "u", status: "ACTIVE", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };
    const product = {
      id: "p1",
      categoryId: null,
      brandId: null,
      unitOfMeasureId: "u1",
      code: "SKU-1",
      name: "Camisa",
      description: null,
      type: "PHYSICAL_GOOD",
      trackInventory: true,
      sellable: true,
      purchasable: true,
      hasVariants: false,
      publishOnline: false,
      barcode: null,
      basePrice: "19.9900",
      baseCost: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([unit]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(unit), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([product]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(product), { status: 201 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listUnitsOfMeasure("access-token", "grupo-aurora", "company-1");
    await client.createUnitOfMeasure("access-token", "grupo-aurora", "company-1", {
      code: "UN",
      name: "Unidad",
      symbol: "u",
    });
    await client.listProducts("access-token", "grupo-aurora", "company-1");
    await client.createProduct("access-token", "grupo-aurora", "company-1", {
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: "u1",
      basePrice: "19.99",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/catalog/units-of-measure",
      expect.objectContaining({ method: "GET" }),
    );
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
      expect(headers.get("X-Company-Id")).toBe("company-1");
    }
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/products",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "SKU-1", name: "Camisa", unitOfMeasureId: "u1", basePrice: "19.99" }),
      }),
    );
  });

  it("uses the documented Customers/Suppliers endpoints, including the company header", async () => {
    const customer = {
      id: "c1",
      code: "CUST-01",
      name: "Acme Corp",
      legalName: null,
      taxId: null,
      email: null,
      phone: null,
      addressLine: null,
      city: null,
      country: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const supplier = { ...customer, id: "s1", code: "SUPP-01", name: "Textiles del Norte" };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([customer]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(customer), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([supplier]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(supplier), { status: 201 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listCustomers("access-token", "grupo-aurora", "company-1");
    await client.createCustomer("access-token", "grupo-aurora", "company-1", { code: "CUST-01", name: "Acme Corp" });
    await client.listSuppliers("access-token", "grupo-aurora", "company-1");
    await client.createSupplier("access-token", "grupo-aurora", "company-1", {
      code: "SUPP-01",
      name: "Textiles del Norte",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/customers", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/suppliers", expect.objectContaining({ method: "GET" }));
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
      expect(headers.get("X-Company-Id")).toBe("company-1");
    }
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/suppliers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "SUPP-01", name: "Textiles del Norte" }),
      }),
    );
  });

  it("uses the documented Taxes/Warehouses/Pricing endpoints, including the company header", async () => {
    const tax = {
      id: "tax-1",
      code: "IVA",
      name: "IVA",
      rate: "12.0000",
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const warehouse = {
      id: "wh-1",
      code: "WH-01",
      name: "Bodega Central",
      addressLine: null,
      city: null,
      country: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const priceList = {
      id: "pl-1",
      code: "WHOLESALE",
      name: "Mayoreo",
      currency: "USD",
      validFrom: null,
      validUntil: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const priceListItem = {
      id: "item-1",
      priceListId: "pl-1",
      productId: "product-1",
      price: "24.9900",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([tax]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([warehouse]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(priceList), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(priceListItem), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listTaxes("access-token", "grupo-aurora", "company-1");
    await client.listWarehouses("access-token", "grupo-aurora", "company-1");
    await client.createPriceList("access-token", "grupo-aurora", "company-1", {
      code: "WHOLESALE",
      name: "Mayoreo",
      currency: "USD",
    });
    await client.addPriceListItem("access-token", "grupo-aurora", "company-1", "pl-1", {
      productId: "product-1",
      price: "24.9900",
    });
    await client.removePriceListItem("access-token", "grupo-aurora", "company-1", "pl-1", "item-1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/taxes", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/warehouses", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/pricing/price-lists",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/pricing/price-lists/pl-1/items",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/pricing/price-lists/pl-1/items/item-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
      expect(headers.get("X-Company-Id")).toBe("company-1");
    }
  });

  it("uses the documented Inventory endpoints, including multi-param query filters", async () => {
    const balance = {
      id: "bal-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      onHandQuantity: "100.0000",
      reservedQuantity: "20.0000",
      availableQuantity: "80.0000",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    };
    const movement = {
      id: "mov-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      type: "RECEIPT",
      quantity: "100.0000",
      reason: null,
      referenceType: "MANUAL",
      referenceId: null,
      correlationId: "corr-1",
      createdByUserId: "user-1",
      createdAt: "2026-08-31T00:00:00.000Z",
    };
    const reservation = {
      id: "res-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "20.0000",
      status: "ACTIVE",
      referenceType: null,
      referenceId: null,
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      releasedAt: null,
    };
    const transfer = {
      id: "transfer-1",
      productId: "product-1",
      productVariantId: null,
      sourceWarehouseId: "wh-1",
      destinationWarehouseId: "wh-2",
      quantity: "15.0000",
      status: "IN_TRANSIT",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      completedAt: null,
      cancelledAt: null,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([balance]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([movement]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(movement), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(movement), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(movement), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([reservation]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(reservation), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...reservation, status: "RELEASED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([transfer]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(transfer), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...transfer, status: "COMPLETED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...transfer, status: "CANCELLED" }), { status: 201 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listInventoryBalances("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-1",
      productId: "product-1",
    });
    await client.listInventoryMovements("access-token", "grupo-aurora", "company-1", { limit: 50 });
    await client.recordInventoryReceipt("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-1",
      productId: "product-1",
      quantity: "100.0000",
    });
    await client.recordInventoryIssue("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-1",
      productId: "product-1",
      quantity: "5.0000",
    });
    await client.adjustInventory("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-1",
      productId: "product-1",
      direction: "DECREASE",
      quantity: "1.0000",
      reason: "Conteo físico",
    });
    await client.listInventoryReservations("access-token", "grupo-aurora", "company-1");
    await client.createInventoryReservation("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-1",
      productId: "product-1",
      quantity: "20.0000",
    });
    await client.releaseInventoryReservation("access-token", "grupo-aurora", "company-1", "res-1");
    await client.listInventoryTransfers("access-token", "grupo-aurora", "company-1", {
      warehouseId: "wh-2",
      status: "IN_TRANSIT",
    });
    await client.createInventoryTransfer("access-token", "grupo-aurora", "company-1", {
      productId: "product-1",
      sourceWarehouseId: "wh-1",
      destinationWarehouseId: "wh-2",
      quantity: "15.0000",
    });
    await client.completeInventoryTransfer("access-token", "grupo-aurora", "company-1", "transfer-1");
    await client.cancelInventoryTransfer("access-token", "grupo-aurora", "company-1", "transfer-1");

    // Multi-param query strings are built in a stable, deterministic order.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/inventory/balances?warehouseId=wh-1&productId=product-1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/inventory/movements?limit=50",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/inventory/movements/receipt",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/inventory/movements/issue",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/inventory/movements/adjustment",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          warehouseId: "wh-1",
          productId: "product-1",
          direction: "DECREASE",
          quantity: "1.0000",
          reason: "Conteo físico",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/v1/inventory/reservations",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/v1/inventory/reservations",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "/api/v1/inventory/reservations/res-1/release",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "/api/v1/inventory/transfers?warehouseId=wh-2&status=IN_TRANSIT",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "/api/v1/inventory/transfers",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      "/api/v1/inventory/transfers/transfer-1/complete",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      "/api/v1/inventory/transfers/transfer-1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
      expect(headers.get("X-Company-Id")).toBe("company-1");
    }
  });

  it("uses the documented Sales and Payments endpoints", async () => {
    const quote = {
      id: "quote-1",
      customerId: "customer-1",
      channel: "ERP",
      status: "DRAFT",
      currency: "USD",
      notes: null,
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
      convertedAt: null,
      cancelledAt: null,
    };
    const quoteLine = {
      id: "quote-line-1",
      quoteId: "quote-1",
      productId: "product-1",
      productVariantId: null,
      taxId: null,
      quantity: "2.0000",
      unitPrice: "19.9900",
      discountAmount: "0.0000",
      taxRate: "0.0000",
      lineTotal: "39.9800",
      createdAt: "2026-08-31T00:00:00.000Z",
    };
    const order = {
      id: "order-1",
      customerId: "customer-1",
      quoteId: "quote-1",
      channel: "ERP",
      status: "DRAFT",
      currency: "USD",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
      confirmedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    };
    const orderLine = {
      id: "order-line-1",
      salesOrderId: "order-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      taxId: null,
      quantity: "2.0000",
      unitPrice: "19.9900",
      discountAmount: "0.0000",
      taxRate: "0.0000",
      lineTotal: "39.9800",
      reservationId: null,
      createdAt: "2026-08-31T00:00:00.000Z",
    };
    const salesReturn = { id: "return-1", salesOrderId: "order-1", reason: "Cambio de opinión", createdAt: "2026-08-31T00:00:00.000Z" };
    const returnLine = { id: "return-line-1", salesReturnId: "return-1", salesOrderLineId: "order-line-1", quantity: "1.0000", createdAt: "2026-08-31T00:00:00.000Z" };
    const payment = {
      id: "payment-1",
      salesOrderId: "order-1",
      method: "CASH",
      status: "CAPTURED",
      amount: "39.9800",
      currency: "USD",
      gatewayReference: null,
      failureReason: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      capturedAt: "2026-08-31T00:00:00.000Z",
      refundedAt: null,
    };

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([quote]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quote), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([quoteLine]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteLine), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(order), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...quote, status: "CANCELLED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([order]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(order), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([orderLine]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderLine), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...order, status: "CONFIRMED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...order, status: "CANCELLED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...order, status: "FULFILLED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([salesReturn]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(salesReturn), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([returnLine]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([payment]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payment), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...payment, status: "REFUNDED" }), { status: 201 }));
    const client = new ApiClient({ fetch: fetchMock });

    await client.listQuotes("access-token", "grupo-aurora", "company-1", { status: "DRAFT" });
    await client.createQuote("access-token", "grupo-aurora", "company-1", { customerId: "customer-1", currency: "USD" });
    await client.listQuoteLines("access-token", "grupo-aurora", "company-1", "quote-1");
    await client.addQuoteLine("access-token", "grupo-aurora", "company-1", "quote-1", { productId: "product-1", quantity: "2.0000" });
    await client.convertQuoteToSalesOrder("access-token", "grupo-aurora", "company-1", "quote-1", { warehouseId: "wh-1" });
    await client.cancelQuote("access-token", "grupo-aurora", "company-1", "quote-2");
    await client.listSalesOrders("access-token", "grupo-aurora", "company-1", { status: "DRAFT" });
    await client.createSalesOrder("access-token", "grupo-aurora", "company-1", { customerId: "customer-1", currency: "USD" });
    await client.listSalesOrderLines("access-token", "grupo-aurora", "company-1", "order-1");
    await client.addSalesOrderLine("access-token", "grupo-aurora", "company-1", "order-1", {
      productId: "product-1",
      warehouseId: "wh-1",
      quantity: "2.0000",
    });
    await client.confirmSalesOrder("access-token", "grupo-aurora", "company-1", "order-1");
    await client.cancelSalesOrder("access-token", "grupo-aurora", "company-1", "order-1");
    await client.fulfillSalesOrder("access-token", "grupo-aurora", "company-1", "order-1");
    await client.listSalesReturns("access-token", "grupo-aurora", "company-1", { salesOrderId: "order-1" });
    await client.createSalesReturn("access-token", "grupo-aurora", "company-1", {
      salesOrderId: "order-1",
      lines: [{ salesOrderLineId: "order-line-1", quantity: "1.0000" }],
    });
    await client.listSalesReturnLines("access-token", "grupo-aurora", "company-1", "return-1");
    await client.listPayments("access-token", "grupo-aurora", "company-1", { salesOrderId: "order-1" });
    await client.capturePayment("access-token", "grupo-aurora", "company-1", {
      salesOrderId: "order-1",
      method: "CASH",
      amount: "39.9800",
      currency: "USD",
      idempotencyKey: "cap-1",
    });
    await client.refundPayment("access-token", "grupo-aurora", "company-1", "payment-1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/sales/quotes?status=DRAFT", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/sales/quotes", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/sales/quotes/quote-1/lines", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/v1/sales/quotes/quote-1/lines", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/v1/sales/quotes/quote-1/convert", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/v1/sales/quotes/quote-2/cancel", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(7, "/api/v1/sales/orders?status=DRAFT", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(8, "/api/v1/sales/orders", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(9, "/api/v1/sales/orders/order-1/lines", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(10, "/api/v1/sales/orders/order-1/lines", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(11, "/api/v1/sales/orders/order-1/confirm", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(12, "/api/v1/sales/orders/order-1/cancel", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(13, "/api/v1/sales/orders/order-1/fulfill", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(14, "/api/v1/sales/returns?salesOrderId=order-1", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(15, "/api/v1/sales/returns", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(16, "/api/v1/sales/returns/return-1/lines", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(17, "/api/v1/payments?salesOrderId=order-1", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(18, "/api/v1/payments/capture", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(19, "/api/v1/payments/payment-1/refund", expect.objectContaining({ method: "POST" }));
    for (const call of fetchMock.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
      expect(headers.get("X-Company-Id")).toBe("company-1");
    }
  });

  it("preserves the backend error envelope", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
          correlationId: "corr-1",
        }),
        { status: 401 },
      ),
    );
    const client = new ApiClient({ fetch: fetchMock });

    const error = await client
      .login({ email: "ana@example.com", password: "wrong-pass" })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      correlationId: "corr-1",
    });
  });

  it("maps transport failures without leaking low-level details", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("connection refused"));
    const client = new ApiClient({ fetch: fetchMock });

    await expect(client.listTenants("access-token")).rejects.toMatchObject({
      statusCode: 0,
      code: "NETWORK_ERROR",
    });
  });
});
