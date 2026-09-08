import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { BillingPage } from "./billing-page";

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

const navigate = vi.fn();
const selection = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
  companyId: "company-1",
};

const plans = [
  {
    key: "starter",
    name: "Starter",
    description: "Plan inicial.",
    currency: "GTQ",
    basePriceAmount: "299.0000",
    perUserPriceAmount: "29.0000",
    includesAppKeys: ["catalog", "sales"],
    isSelfServe: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "A medida.",
    currency: "GTQ",
    basePriceAmount: "0.0000",
    perUserPriceAmount: "0.0000",
    includesAppKeys: Array.from({ length: 15 }, (_, i) => `app-${i}`),
    isSelfServe: false,
  },
];

describe("BillingPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a setup notice when the tenant has no subscription yet", async () => {
    vi.spyOn(apiClient, "listPlans").mockResolvedValue(plans);
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue(null);
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([]);

    render(<BillingPage selection={selection} navigate={navigate} />);

    expect(await screen.findByText("Sin suscripción activa")).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay movimientos registrados.")).toBeInTheDocument();
  });

  it("shows the active plan, its status, and marks it in the plans grid", async () => {
    vi.spyOn(apiClient, "listPlans").mockResolvedValue(plans);
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue({
      tenantId: "tenant-1",
      planKey: "starter",
      status: "ACTIVE",
      seatCount: 3,
      currentPeriodStart: "2026-01-01T00:00:00.000Z",
      currentPeriodEnd: "2026-02-01T00:00:00.000Z",
      cancelledAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([
      { id: "evt-1", eventType: "subscription.create", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<BillingPage selection={selection} navigate={navigate} />);

    expect(await screen.findByText("Activa")).toBeInTheDocument();
    expect(screen.getByText(/3 usuarios/)).toBeInTheDocument();
    expect(screen.getByText(/Próxima renovación/)).toBeInTheDocument();
    expect(screen.getByText("Suscripción activada")).toBeInTheDocument();
    expect(screen.getByText("Plan actual")).toBeInTheDocument();
  });

  it("never shows a pending, unpaid plan as 'Plan actual' — and offers a real way to finish paying it", async () => {
    // Regresses a real bug: CreateCheckoutSessionUseCase writes the row as
    // soon as checkout starts (so Recurrente's webhook has something to
    // correlate against), so a shopper who starts checkout and comes back
    // without paying lands here with status PENDING for that exact plan —
    // this must never read as "you already have this plan".
    vi.spyOn(apiClient, "listPlans").mockResolvedValue(plans);
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue({
      tenantId: "tenant-1",
      planKey: "starter",
      status: "PENDING",
      seatCount: 1,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelledAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([]);
    const checkout = vi
      .spyOn(apiClient, "createCheckoutSession")
      .mockResolvedValue({ checkoutUrl: "https://app.recurrente.com/checkout-session/ch_2" });

    render(<BillingPage selection={selection} navigate={navigate} />);

    expect(await screen.findAllByText("Pendiente de confirmación")).not.toHaveLength(0);
    expect(screen.queryByText("Plan actual")).not.toBeInTheDocument();
    expect(screen.getByText(/completa el pago en Recurrente/i)).toBeInTheDocument();

    const user = userEvent.setup();
    const retryButton = screen.getByRole("button", { name: "Completar pago" });
    await user.click(retryButton);

    await waitFor(() =>
      expect(checkout).toHaveBeenCalledWith(
        "access-token",
        "grupo-aurora",
        expect.objectContaining({ planKey: "starter" }),
      ),
    );
  });

  it("starts a real checkout session and never fabricates a paid plan without a real click", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listPlans").mockResolvedValue(plans);
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue(null);
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([]);
    const checkout = vi
      .spyOn(apiClient, "createCheckoutSession")
      .mockResolvedValue({ checkoutUrl: "https://app.recurrente.com/checkout-session/ch_1" });

    render(<BillingPage selection={selection} navigate={navigate} />);

    const button = await screen.findByRole("button", { name: "Suscribirse" });
    await user.click(button);

    await waitFor(() =>
      expect(checkout).toHaveBeenCalledWith(
        "access-token",
        "grupo-aurora",
        expect.objectContaining({ planKey: "starter" }),
      ),
    );
  });

  it("shows a real, honest note for a non-self-serve plan instead of a fake checkout button", async () => {
    vi.spyOn(apiClient, "listPlans").mockResolvedValue(plans);
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue(null);
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([]);

    render(<BillingPage selection={selection} navigate={navigate} />);

    const enterpriseCard = (await screen.findByText("Enterprise")).closest("div")!.parentElement!;
    expect(within(enterpriseCard).getByText(/Contacta a tu representante comercial/)).toBeInTheDocument();
    expect(within(enterpriseCard).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a real error when loading fails, never a blank/misleading screen", async () => {
    vi.spyOn(apiClient, "listPlans").mockRejectedValue(new Error("network down"));
    vi.spyOn(apiClient, "getTenantSubscription").mockResolvedValue(null);
    vi.spyOn(apiClient, "listBillingActivity").mockResolvedValue([]);

    render(<BillingPage selection={selection} navigate={navigate} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });
});
