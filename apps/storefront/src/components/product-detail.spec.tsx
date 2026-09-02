import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartResponse, PublicProductDetailResponse } from "@erp/api-client";
import { ApiError } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import { getStoredCartId } from "@/lib/cart-storage";
import { ProductDetail } from "./product-detail";

const simpleProduct: PublicProductDetailResponse = {
  productId: "product-1",
  code: "SKU-1",
  name: "Camisa azul",
  description: "Camisa de algodón.",
  hasVariants: false,
  basePrice: "25.0000",
  variants: [],
};

const variantProduct: PublicProductDetailResponse = {
  productId: "product-2",
  code: "SKU-2",
  name: "Pantalón",
  description: null,
  hasVariants: true,
  basePrice: null,
  variants: [
    { id: "variant-1", sku: "PANT-S", price: "40.0000", attributes: { talla: "S" } },
    { id: "variant-2", sku: "PANT-M", price: "42.0000", attributes: { talla: "M" } },
  ],
};

const cart: CartResponse = {
  id: "cart-1",
  currency: "USD",
  status: "OPEN",
  lines: [],
  subtotal: "0.0000",
};

describe("ProductDetail", () => {
  it("adds a simple (no-variant) product to a brand-new cart", async () => {
    const user = userEvent.setup();
    const createCartMock = vi.spyOn(apiClient, "createCart").mockResolvedValue(cart);
    const addCartLineMock = vi.spyOn(apiClient, "addCartLine").mockResolvedValue(cart);

    render(<ProductDetail product={simpleProduct} />);

    expect(screen.getByRole("heading", { name: "Camisa azul" })).toBeInTheDocument();
    expect(screen.getByText("25.00")).toBeInTheDocument();
    expect(screen.queryByLabelText("Variante")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(createCartMock).toHaveBeenCalledWith("main-store");
    expect(addCartLineMock).toHaveBeenCalledWith("main-store", "cart-1", {
      productId: "product-1",
      quantity: "1",
    });
    expect(await screen.findByText(/Producto agregado al carrito/)).toBeInTheDocument();
    expect(getStoredCartId()).toBe("cart-1");
  });

  it("reuses an already-stored cart instead of creating a new one", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("erp-storefront:cart-id", "existing-cart");
    const createCartMock = vi.spyOn(apiClient, "createCart");
    vi.spyOn(apiClient, "addCartLine").mockResolvedValue(cart);

    render(<ProductDetail product={simpleProduct} />);
    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(createCartMock).not.toHaveBeenCalled();
    expect(apiClient.addCartLine).toHaveBeenCalledWith(
      "main-store",
      "existing-cart",
      expect.objectContaining({ productId: "product-1" }),
    );
  });

  it("lets a shopper pick a variant and sends its id and price with the cart line", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "createCart").mockResolvedValue(cart);
    const addCartLineMock = vi.spyOn(apiClient, "addCartLine").mockResolvedValue(cart);

    render(<ProductDetail product={variantProduct} />);

    expect(screen.getByText(/PANT-S/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Variante"), "variant-2");
    expect(screen.getByText("42.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(addCartLineMock).toHaveBeenCalledWith(
      "main-store",
      "cart-1",
      expect.objectContaining({ productId: "product-2", productVariantId: "variant-2" }),
    );
  });

  it("shows the backend's real error message when adding to the cart fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "createCart").mockResolvedValue(cart);
    vi.spyOn(apiClient, "addCartLine").mockRejectedValue(
      new ApiError({ statusCode: 409, code: "CART_NOT_OPEN", message: "This cart is no longer open." }),
    );

    render(<ProductDetail product={simpleProduct} />);
    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This cart is no longer open.");
  });
});
