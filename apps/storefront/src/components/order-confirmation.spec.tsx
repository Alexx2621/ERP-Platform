import { render, screen } from "@testing-library/react";
import type { CommerceOrderResponse } from "@erp/api-client";
import { OrderConfirmation } from "./order-confirmation";

const baseOrder: CommerceOrderResponse = {
  id: "order-1",
  storefrontId: "storefront-1",
  cartId: "cart-1",
  salesOrderId: "sales-order-1",
  paymentId: null,
  customerId: "customer-1",
  guestEmail: "shopper@example.com",
  total: "40.0000",
  currency: "USD",
  createdAt: "2026-09-02T00:00:00.000Z",
};

describe("OrderConfirmation", () => {
  it("states the payment is pending manual confirmation when no payment is on file", () => {
    render(<OrderConfirmation order={baseOrder} />);

    expect(
      screen.getByText(/Pago pendiente de confirmación/),
    ).toBeInTheDocument();
    expect(screen.getByText(/40\.00/)).toBeInTheDocument();
  });

  it("states the payment is confirmed when the order has a real payment", () => {
    render(<OrderConfirmation order={{ ...baseOrder, paymentId: "payment-1" }} />);

    expect(screen.getByText("Pago confirmado.")).toBeInTheDocument();
  });

  it("never fabricates a tracking number or delivery estimate", () => {
    render(<OrderConfirmation order={baseOrder} />);

    expect(screen.queryByText(/tracking/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/entrega/i)).not.toBeInTheDocument();
  });
});
