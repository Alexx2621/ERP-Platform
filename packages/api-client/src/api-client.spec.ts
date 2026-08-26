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
