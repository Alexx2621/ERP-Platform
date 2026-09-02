import { render, screen } from "@testing-library/react";
import { ApiError } from "@erp/api-client";
import type { PublicProductSummaryResponse } from "@erp/api-client";
import { apiClient } from "@/lib/api-client";
import HomePage from "./page";

const products: PublicProductSummaryResponse[] = [
  {
    productId: "product-1",
    code: "SKU-1",
    name: "Camisa azul",
    description: null,
    hasVariants: false,
    basePrice: "25.0000",
  },
  {
    productId: "product-2",
    code: "SKU-2",
    name: "Pantalón",
    description: null,
    hasVariants: true,
    basePrice: null,
  },
];

// HomePage is an async Server Component — it's just an async function that
// returns JSX, so it can be invoked directly and its resolved JSX handed to
// render(), the standard pattern for unit-testing App Router server
// components without a full Next server runtime.
describe("HomePage", () => {
  it("renders the published products with their price", async () => {
    vi.spyOn(apiClient, "listPublicProducts").mockResolvedValue(products);

    render(await HomePage());

    expect(screen.getByText("Camisa azul")).toBeInTheDocument();
    expect(screen.getByText("Pantalón")).toBeInTheDocument();
    expect(screen.getByText("25.00")).toBeInTheDocument();
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
  });

  it("shows an honest empty state when the catalog has no published products", async () => {
    vi.spyOn(apiClient, "listPublicProducts").mockResolvedValue([]);

    render(await HomePage());

    expect(
      screen.getByText("Todavía no hay productos publicados en esta tienda."),
    ).toBeInTheDocument();
  });

  it("renders a real error state, showing the backend's own message, when the store can't be reached", async () => {
    vi.spyOn(apiClient, "listPublicProducts").mockRejectedValue(
      new ApiError({
        statusCode: 404,
        code: "STOREFRONT_NOT_FOUND",
        message: "No storefront exists with this code.",
      }),
    );

    render(await HomePage());

    expect(screen.getByRole("alert")).toHaveTextContent("No storefront exists with this code.");
  });
});
