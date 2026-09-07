import { useAnimatedNumber } from "../hooks/use-animated-number";

interface AnimatedMoneyProps {
  amount: string;
  currency: string;
  className?: string;
}

/** Same formatting as `formatMoney`, but eases toward a new value instead
 * of jumping — see `useAnimatedNumber`. Parses once per render; the parsed
 * float is display-only, never fed back into a calculation. */
export function AnimatedMoney({ amount, currency, className }: AnimatedMoneyProps) {
  const target = Number.parseFloat(amount);
  const animated = useAnimatedNumber(Number.isFinite(target) ? target : 0);
  const formatted = (() => {
    try {
      return new Intl.NumberFormat("es-GT", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(animated);
    } catch {
      return `${animated.toFixed(2)} ${currency}`;
    }
  })();
  return <span className={className}>{formatted}</span>;
}
