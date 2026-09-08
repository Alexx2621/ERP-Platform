import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerResponse, PaymentResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import {
  HomeDashboard,
  findFreeSlot,
  migrateLegacyLayout,
  reconcileLayout,
  rectsOverlap,
  type WidgetRect,
} from "./home-dashboard";
import { dashboardWidgets } from "./widget-definitions";
import type { DashboardData } from "./use-dashboard-data";

const authContext = vi.hoisted(() => ({
  session: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z",
    user: { id: "user-1", email: "owner@example.com", displayName: "Propietaria" },
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../shared/auth/auth-context", () => ({
  useAuth: () => authContext,
}));

const selection = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
  companyId: "company-1",
};

const EMPTY_DATA: DashboardData = {
  customers: null,
  products: null,
  salesOrders: null,
  payments: null,
  purchaseOrders: null,
  posSales: null,
  pipelineSummary: null,
  productionOrders: null,
  inventoryBalances: null,
  commerceOrders: null,
  auditEntries: null,
  topProducts: null,
};

function customer(status: "ACTIVE" | "INACTIVE"): CustomerResponse {
  return {
    id: `cust-${Math.random()}`,
    code: "CUST-1",
    name: "Cliente",
    legalName: null,
    taxId: null,
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    country: null,
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function payment(overrides: Partial<PaymentResponse>): PaymentResponse {
  return {
    id: `pay-${Math.random()}`,
    salesOrderId: "order-1",
    method: "CASH",
    status: "CAPTURED",
    amount: "0.0000",
    currency: "GTQ",
    gatewayReference: null,
    failureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    capturedAt: null,
    refundedAt: null,
    ...overrides,
  };
}

function rect(x: number, y: number, w: number, h: number): WidgetRect {
  return { x, y, w, h };
}

describe("rectsOverlap (pure function)", () => {
  it("detects a genuine overlap", () => {
    expect(rectsOverlap(rect(0, 0, 4, 4), rect(2, 2, 4, 4))).toBe(true);
  });

  it("two rects sharing only an edge do not overlap", () => {
    expect(rectsOverlap(rect(0, 0, 4, 4), rect(4, 0, 4, 4))).toBe(false);
    expect(rectsOverlap(rect(0, 0, 4, 4), rect(0, 4, 4, 4))).toBe(false);
  });

  it("rects far apart never overlap", () => {
    expect(rectsOverlap(rect(0, 0, 2, 2), rect(10, 10, 2, 2))).toBe(false);
  });
});

describe("findFreeSlot (pure function)", () => {
  it("places the first widget at the origin when nothing is occupied", () => {
    expect(findFreeSlot({}, 4, 4, 12)).toEqual(rect(0, 0, 4, 4));
  });

  it("never returns a rect that overlaps an already-occupied one", () => {
    const occupied = { a: rect(0, 0, 4, 4) };
    const found = findFreeSlot(occupied, 4, 4, 12);
    expect(rectsOverlap(found, occupied.a)).toBe(false);
  });

  it("packs left-to-right before wrapping to the next row", () => {
    const occupied = { a: rect(0, 0, 4, 4) };
    expect(findFreeSlot(occupied, 4, 4, 12)).toEqual(rect(4, 0, 4, 4));
  });

  it("wraps to a new row once a row's width is exhausted", () => {
    const occupied = { a: rect(0, 0, 8, 4), b: rect(8, 0, 4, 4) };
    expect(findFreeSlot(occupied, 4, 4, 12)).toEqual(rect(0, 4, 4, 4));
  });

  it("fits into a genuinely empty gap left in the middle of the grid", () => {
    // a leaves x=4..8 free on row 0; a 4-wide widget should reclaim it
    // instead of being pushed to a brand-new row.
    const occupied = { a: rect(0, 0, 4, 4), b: rect(8, 0, 4, 4) };
    expect(findFreeSlot(occupied, 4, 4, 12)).toEqual(rect(4, 0, 4, 4));
  });
});

describe("reconcileLayout (pure function)", () => {
  const knownIds = new Set(dashboardWidgets.map((widget) => widget.id));

  it("assigns every known widget a real, collision-free position from a blank profile", () => {
    const result = reconcileLayout(null);
    const placed = Object.values(result.positions);
    expect(Object.keys(result.positions).sort()).toEqual([...knownIds].sort());
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(rectsOverlap(placed[i], placed[j])).toBe(false);
      }
    }
  });

  it("keeps a valid stored position for a known widget untouched", () => {
    const stored = { hidden: [], positions: { "active-customers": rect(5, 3, 4, 4) } };
    const result = reconcileLayout(stored);
    expect(result.positions["active-customers"]).toEqual(rect(5, 3, 4, 4));
  });

  it("drops a widget id no longer present in the registry", () => {
    const stored = { hidden: [], positions: { "ghost-widget": rect(0, 0, 4, 4) } };
    const result = reconcileLayout(stored);
    expect(result.positions["ghost-widget"]).toBeUndefined();
  });

  it("discards an invalid stored rect (out of bounds) and re-places the widget for real", () => {
    const stored = { hidden: [], positions: { "active-customers": rect(10, 0, 8, 4) } };
    const result = reconcileLayout(stored);
    expect(result.positions["active-customers"]).not.toEqual(rect(10, 0, 8, 4));
    expect(result.positions["active-customers"].x + result.positions["active-customers"].w).toBeLessThanOrEqual(12);
  });

  it("a hidden widget's stale position never blocks a visible widget from reusing that space", () => {
    // active-customers is hidden and still "parked" at (0,0); with only it
    // stored, every visible widget should be free to land at (0,0) too.
    const stored = { hidden: ["active-customers"], positions: { "active-customers": rect(0, 0, 4, 4) } };
    const result = reconcileLayout(stored);
    expect(result.positions["active-products"]).toEqual(rect(0, 0, 4, 4));
  });
});

describe("migrateLegacyLayout (pure function)", () => {
  it("converts a real pre-profiles single layout into real, collision-free positions", () => {
    const migrated = migrateLegacyLayout({
      order: ["active-customers", "active-products", "sales-trend"],
      hidden: ["open-sales-orders"],
      sizes: { "sales-trend": "wide" },
    });
    expect(migrated.hidden).toEqual(["open-sales-orders"]);
    expect(migrated.positions["sales-trend"].w).toBe(8);
    // Only *visible* widgets are guaranteed collision-free — a hidden
    // widget's stored spot is deliberately allowed to coincide with a
    // visible one's (see reconcileLayout's own docstring), so it's
    // excluded here rather than asserted against.
    const placed = Object.entries(migrated.positions)
      .filter(([id]) => !migrated.hidden.includes(id))
      .map(([, value]) => value);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(rectsOverlap(placed[i], placed[j])).toBe(false);
      }
    }
  });

  it("still places a widget missing from the legacy order (added to the registry since)", () => {
    const migrated = migrateLegacyLayout({ order: ["active-customers"], hidden: [], sizes: {} });
    expect(migrated.positions["sales-trend"]).toBeDefined();
  });
});

describe("widget compute functions", () => {
  it("active-customers counts only ACTIVE customers, out of the real total", () => {
    const widget = dashboardWidgets.find((item) => item.id === "active-customers")!;
    const result = widget.compute!({
      ...EMPTY_DATA,
      customers: [customer("ACTIVE"), customer("ACTIVE"), customer("INACTIVE")],
    });
    expect(result).toEqual({ value: "2", caption: "3 en total" });
  });

  it("captured-today sums only payments captured today, ignoring other statuses/days", () => {
    const widget = dashboardWidgets.find((item) => item.id === "captured-today")!;
    const today = new Date().toISOString();
    const result = widget.compute!({
      ...EMPTY_DATA,
      payments: [
        payment({ amount: "100.0000", status: "CAPTURED", capturedAt: today }),
        payment({ amount: "50.5000", status: "CAPTURED", capturedAt: today }),
        payment({ amount: "999.0000", status: "CAPTURED", capturedAt: "2020-01-01T00:00:00.000Z" }),
        payment({ amount: "10.0000", status: "FAILED", capturedAt: today }),
      ],
    });
    expect(result?.caption).toBe("2 pagos hoy");
    expect(result?.value).toContain("150.50");
  });

  it("returns null (not a fabricated zero) when its data source failed to load", () => {
    const widget = dashboardWidgets.find((item) => item.id === "active-customers")!;
    expect(widget.compute!(EMPTY_DATA)).toBeNull();
  });
});

function mockAllDataSources() {
  vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
  vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
  vi.spyOn(apiClient, "listSalesOrders").mockResolvedValue([]);
  vi.spyOn(apiClient, "listPayments").mockResolvedValue([]);
  vi.spyOn(apiClient, "listPurchaseOrders").mockResolvedValue([]);
  vi.spyOn(apiClient, "listPosSales").mockResolvedValue([]);
  vi.spyOn(apiClient, "listPipelines").mockResolvedValue([]);
  vi.spyOn(apiClient, "listProductionOrders").mockResolvedValue([]);
  vi.spyOn(apiClient, "listInventoryBalances").mockResolvedValue([]);
  vi.spyOn(apiClient, "listCommerceOrders").mockResolvedValue([]);
}

describe("HomeDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders real widget values computed from the loaded data and navigates on click", async () => {
    mockAllDataSources();
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([customer("ACTIVE"), customer("ACTIVE")]);
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const navigate = vi.fn();

    render(<HomeDashboard selection={selection} navigate={navigate} />);

    const card = await screen.findByText("Clientes activos");
    expect(card.closest("button")).toHaveTextContent("2");

    await userEvent.click(card.closest("button")!);
    expect(navigate).toHaveBeenCalledWith("/contacts");
  });

  it("removes a widget, persists it under the active profile, and restores it from the 'Agregar widget' menu", async () => {
    mockAllDataSources();
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi
      .spyOn(apiClient, "setUserPreference")
      .mockResolvedValue({ key: "ui.dashboardProfiles", value: {}, updatedAt: "2026-01-01T00:00:00.000Z" });

    render(<HomeDashboard selection={selection} navigate={vi.fn()} />);
    await screen.findByText("Clientes activos");

    await userEvent.click(screen.getByRole("button", { name: "Quitar Clientes activos" }));
    await waitFor(() => expect(screen.queryByText("Clientes activos")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith(
        "access-token",
        "ui.dashboardProfiles",
        expect.objectContaining({
          activeProfile: 0,
          profiles: expect.arrayContaining([expect.objectContaining({ hidden: ["active-customers"] })]),
        }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Agregar widget" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Clientes activos/ }));
    expect(await screen.findByText("Clientes activos")).toBeInTheDocument();
  });

  it("migrates a real pre-profiles saved layout into profile 1 instead of discarding it", async () => {
    mockAllDataSources();
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([
      {
        key: "ui.dashboardLayout",
        value: { order: ["active-customers"], hidden: ["active-products"], sizes: {} },
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    render(<HomeDashboard selection={selection} navigate={vi.fn()} />);

    await screen.findByText("Clientes activos");
    expect(screen.queryByText("Productos activos")).not.toBeInTheDocument();
  });

  it("switches between the 3 profile tabs, each with its own independent hidden-widget set", async () => {
    mockAllDataSources();
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.dashboardProfiles",
      value: {},
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(<HomeDashboard selection={selection} navigate={vi.fn()} />);
    await screen.findByText("Clientes activos");

    const tabs = screen.getByRole("tablist", { name: "Perfiles del dashboard" });
    await userEvent.click(screen.getByRole("button", { name: "Quitar Clientes activos" }));
    await waitFor(() => expect(screen.queryByText("Clientes activos")).not.toBeInTheDocument());

    await userEvent.click(within(tabs).getByRole("tab", { name: "Perfil 2" }));
    expect(await screen.findByText("Clientes activos")).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole("tab", { name: "Perfil 1" }));
    await waitFor(() => expect(screen.queryByText("Clientes activos")).not.toBeInTheDocument());
  });
});
