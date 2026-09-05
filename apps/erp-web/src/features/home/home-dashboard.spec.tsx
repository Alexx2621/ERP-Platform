import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerResponse, PaymentResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { HomeDashboard, reorderWidgets } from "./home-dashboard";
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

describe("reorderWidgets (pure function)", () => {
  it("dragging a widget onto its immediate next neighbor swaps them", () => {
    // Regression test: the first implementation always inserted the dragged
    // widget "before" the target, which for an immediate-neighbor drag put
    // it right back where it started — a silent no-op the drop placeholder
    // still animated for. Found by this file's own drag-and-drop render
    // test failing on exactly this scenario (index 0 dragged onto index 1).
    expect(reorderWidgets(["a", "b", "c"], "a", "b")).toEqual(["b", "a", "c"]);
  });

  it("moves a widget forward multiple positions, landing right after its target", () => {
    expect(reorderWidgets(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("moves a widget backward, landing right before its target", () => {
    expect(reorderWidgets(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when the dragged widget is dropped on itself", () => {
    expect(reorderWidgets(["a", "b", "c"], "b", "b")).toEqual(["a", "b", "c"]);
  });

  it("returns the original order when the target id no longer exists", () => {
    expect(reorderWidgets(["a", "b", "c"], "a", "missing")).toEqual(["a", "b", "c"]);
  });

  it("returns the original order when the dragged id no longer exists", () => {
    expect(reorderWidgets(["a", "b", "c"], "missing", "a")).toEqual(["a", "b", "c"]);
  });
});

describe("widget compute functions", () => {
  it("active-customers counts only ACTIVE customers, out of the real total", () => {
    const widget = dashboardWidgets.find((item) => item.id === "active-customers")!;
    const result = widget.compute({
      ...EMPTY_DATA,
      customers: [customer("ACTIVE"), customer("ACTIVE"), customer("INACTIVE")],
    });
    expect(result).toEqual({ value: "2", caption: "3 en total" });
  });

  it("captured-today sums only payments captured today, ignoring other statuses/days", () => {
    const widget = dashboardWidgets.find((item) => item.id === "captured-today")!;
    const today = new Date().toISOString();
    const result = widget.compute({
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
    expect(widget.compute(EMPTY_DATA)).toBeNull();
  });
});

describe("HomeDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders real widget values computed from the loaded data and navigates on click", async () => {
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([customer("ACTIVE"), customer("ACTIVE")]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listSalesOrders").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPayments").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPurchaseOrders").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPosSales").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPipelines").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProductionOrders").mockResolvedValue([]);
    vi.spyOn(apiClient, "listInventoryBalances").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCommerceOrders").mockResolvedValue([]);
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const navigate = vi.fn();

    render(<HomeDashboard selection={selection} navigate={navigate} />);

    const card = await screen.findByText("Clientes activos");
    expect(card.closest("button")).toHaveTextContent("2");

    await userEvent.click(card.closest("button")!);
    expect(navigate).toHaveBeenCalledWith("/contacts");
  });

  it("removes a widget, persists it, and restores it from the 'Agregar widget' menu", async () => {
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
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi
      .spyOn(apiClient, "setUserPreference")
      .mockResolvedValue({ key: "ui.dashboardLayout", value: {}, updatedAt: "2026-01-01T00:00:00.000Z" });

    render(<HomeDashboard selection={selection} navigate={vi.fn()} />);
    await screen.findByText("Clientes activos");

    await userEvent.click(screen.getByRole("button", { name: "Quitar Clientes activos" }));
    await waitFor(() => expect(screen.queryByText("Clientes activos")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith(
        "access-token",
        "ui.dashboardLayout",
        expect.objectContaining({ hidden: ["active-customers"] }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Agregar widget" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Clientes activos/ }));
    expect(await screen.findByText("Clientes activos")).toBeInTheDocument();
  });

  it("reorders widgets via drag-and-drop, showing the drop placeholder while dragging over the target", async () => {
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
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.dashboardLayout",
      value: {},
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(<HomeDashboard selection={selection} navigate={vi.fn()} />);
    const first = await screen.findByText("Clientes activos");
    const secondTitle = await screen.findByText("Productos activos");
    const firstCard = first.closest('[draggable="true"]')!;
    const secondCard = secondTitle.closest('[draggable="true"]')!;

    fireEvent.dragStart(firstCard);
    fireEvent.dragOver(secondCard);
    expect(await screen.findByText("Soltar aquí")).toBeInTheDocument();

    fireEvent.drop(secondCard);

    await waitFor(() => {
      // Query the two title paragraphs directly, in DOM order, rather than
      // every <button> on the page — each card renders three buttons
      // (resize/remove/navigate) whose accessible names/text overlap in
      // ways that made an earlier version of this assertion pass or fail
      // for reasons unrelated to the actual widget order.
      const titles = screen
        .getAllByText(/^(Clientes activos|Productos activos)$/)
        .map((node) => node.textContent);
      expect(titles.indexOf("Productos activos")).toBeLessThan(titles.indexOf("Clientes activos"));
    });
  });
});
