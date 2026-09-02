import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos en tu carrito antes de pagar.",
};

export default function CartPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-extrabold text-[var(--ink)]">Tu carrito</h1>
      <CartView />
    </div>
  );
}
