import { ApiClient, ApiError } from "./api-client.js";
import { describe, expect, it, vi } from "vitest";

const session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshExpiresAt: "2099-01-02T00:00:00.000Z",
  user: { id: "user-1", email: "ana@example.com", displayName: "Ana" },
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

  it("lists tenant audit entries with the documented limit and tenant header", async () => {
    const entry = {
      id: "audit-1",
      userId: "user-1",
      tenantId: "tenant-1",
      companyId: null,
      action: "tenant.provisioned",
      resource: "tenant",
      resourceId: "tenant-1",
      previousValues: null,
      newValues: { name: "Grupo Aurora" },
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      correlationId: "correlation-1",
      createdAt: "2026-08-27T19:40:23.000Z",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([entry]), { status: 200 }));
    const client = new ApiClient({ fetch: fetchMock });
    const signal = new AbortController().signal;

    await expect(
      client.listAuditEntries("access-token", "grupo-aurora", 100, signal),
    ).resolves.toEqual([entry]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/audit-entries?limit=100",
      expect.objectContaining({ method: "GET", signal }),
    );
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tenant-Slug")).toBe("grupo-aurora");
    expect(headers.get("X-Company-Id")).toBeNull();
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
