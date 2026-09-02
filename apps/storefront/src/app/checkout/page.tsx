import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = {
  title: "Pagar",
  description: "Completa tus datos para confirmar tu pedido.",
};

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-extrabold text-[var(--ink)]">Confirmar pedido</h1>
      <CheckoutView />
    </div>
  );
}
