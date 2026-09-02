import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartResponse, PublicProductDetailResponse } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { setStoredCartId } from "@/lib/cart-storage";
import { CartView } from "./cart-view";

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

const cartWithLines: CartResponse = {
  id: "cart-1",
  currency: "USD",
  status: "OPEN",
  lines: [
    {
      id: "line-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "2.0000",
      unitPrice: "25.0000",
      subtotal: "50.0000",
    },
  ],
  subtotal: "50.0000",
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

describe("CartView", () => {
  it("shows an empty state with a link back to the store when there is no stored cart", async () => {
    render(<CartView />);

    expect(await screen.findByText("Todavía no tienes productos en tu carrito.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la tienda" })).toHaveAttribute("href", "/");
  });

  it("loads and renders a stored cart's lines, resolving product names", async () => {
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cartWithLines);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);

    render(<CartView />);

    expect(await screen.findByText("Camisa azul")).toBeInTheDocument();
    // "$50.00" appears twice on purpose: once as this line's own subtotal,
    // once as the cart's overall subtotal — there's only one line, so both
    // are the same amount.
    expect(screen.getAllByText(/50\.00/)).toHaveLength(2);
  });

  it("removes a line and reflects the updated cart returned by the backend", async () => {
    const user = userEvent.setup();
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cartWithLines);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);
    const emptyCart: CartResponse = { ...cartWithLines, lines: [], subtotal: "0.0000" };
    const removeCartLineMock = vi.spyOn(apiClient, "removeCartLine").mockResolvedValue(emptyCart);

    render(<CartView />);
    await screen.findByText("Camisa azul");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(removeCartLineMock).toHaveBeenCalledWith("main-store", "cart-1", "line-1");
    await waitFor(() =>
      expect(screen.getByText("Todavía no tienes productos en tu carrito.")).toBeInTheDocument(),
    );
  });

  it("navigates to checkout when the shopper proceeds to pay", async () => {
    const user = userEvent.setup();
    setStoredCartId("cart-1");
    vi.spyOn(apiClient, "getCart").mockResolvedValue(cartWithLines);
    vi.spyOn(apiClient, "getPublicProduct").mockResolvedValue(product);

    render(<CartView />);
    await screen.findByText("Camisa azul");

    await user.click(screen.getByRole("button", { name: "Proceder al pago" }));

    expect(push).toHaveBeenCalledWith("/checkout");
  });
});
