import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartResponse, CommerceOrderResponse, PublicProductDetailResponse } from "@erp/api-client";
import { ApiError } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { getStoredCartId, setStoredCartId } from "@/lib/cart-storage";
import { CheckoutView } from "./checkout-view";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  // `push` is a plain vi.fn(), not a vi.spyOn() on an existing method — the
  // shared `afterEach(() => vi.restoreAllMocks())` in test/setup.ts has no
  // effect on it (restoreAllMocks only restores real spies), so its call
  // history would otherwise leak across tests in this file.
  push.mockClear();
});

const cart: CartResponse = {
  id: "cart-1",
  currency: "USD",
  status: "OPEN",
  lines: [
    {
      id: "line-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "1.0000",
      unitPrice: "25.0000",
      subtotal: "25.0000",
    },
  ],
  subtotal: "25.0000",
};

const product: PublicProductDetailResponse = {
  productId: "product-1",
  code: "SKU-1",
  name: "Camisa azul",
  description: null,
  hasVariants: false,
  basePrice: "25.0000",
  variants: [],
};

const order: CommerceOrderResponse = {
  id: "order-1",
  storefrontId: "storefront-1",
  cartId: "cart-1",
  salesOrderId: "sales-order-1",
  paymentId: null,
  customerId: "customer-1",
  guestEmail: "shopper@example.com",
  total: "25.0000",
  currency: "USD",
  createdAt: "2026-09-02T00:00:00.000Z",
};

describe("CheckoutView", () => {
  it("guides the shopper back to the store when there is no cart to check out", async () => {
    render(<CheckoutView />);

    expect(
      await screen.findByText(/No tienes un carrito activo con productos/),
    ).toBeInTheDocument();
  });

  it("submits guest details and checks out, omitting the payment reference when left blank", async () => {
    const user = userEvent.setup();
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cart);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);
    const checkoutMock = vi.spyOn(apiClient, "checkout").mockResolvedValue(order);

    render(<CheckoutView />);
    await screen.findByText("Camisa azul");

    await user.type(screen.getByLabelText("Nombre completo"), "Ana López");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    expect(checkoutMock).toHaveBeenCalledWith("main-store", "cart-1", {
      guestName: "Ana López",
      guestEmail: "ana@example.com",
    });
    expect(push).toHaveBeenCalledWith("/orders/order-1");
    expect(getStoredCartId()).toBeNull();
  });

  it("includes the payment reference when the shopper provides one", async () => {
    const user = userEvent.setup();
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cart);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);
    const checkoutMock = vi.spyOn(apiClient, "checkout").mockResolvedValue(order);

    render(<CheckoutView />);
    await screen.findByText("Camisa azul");

    await user.type(screen.getByLabelText("Nombre completo"), "Ana López");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(
      screen.getByLabelText(/Referencia de transferencia bancaria/),
      "TRX-12345",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    expect(checkoutMock).toHaveBeenCalledWith("main-store", "cart-1", {
      guestName: "Ana López",
      guestEmail: "ana@example.com",
      paymentReference: "TRX-12345",
    });
  });

  it("shows the backend's real error and keeps the cart so the shopper can retry", async () => {
    const user = userEvent.setup();
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cart);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);
    vi.spyOn(apiClient, "checkout").mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "INSUFFICIENT_INVENTORY_FOR_ORDER",
        message: "There is not enough inventory to fulfill this order.",
      }),
    );

    render(<CheckoutView />);
    await screen.findByText("Camisa azul");

    await user.type(screen.getByLabelText("Nombre completo"), "Ana López");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "There is not enough inventory to fulfill this order.",
    );
    expect(getStoredCartId()).toBe("cart-1");
    expect(push).not.toHaveBeenCalled();
  });
});
