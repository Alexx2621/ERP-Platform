import {
  Package,
  PlusCircle,
  ShoppingCartSimple,
  Truck,
  UserPlus,
  type Icon,
} from "@phosphor-icons/react";
import type { AppPath } from "../../../shared/navigation/router";

interface QuickAction {
  label: string;
  icon: Icon;
  path: AppPath;
}

/**
 * Every action here just navigates — this router has no query-param model
 * (`AppPath` is a closed string union of bare paths), so "jump straight
 * into the new-order form" would need real plumbing across each target
 * page, not a URL flag. Honest scope: one click to the right screen, not a
 * pretend deep link.
 */
const ACTIONS: QuickAction[] = [
  { label: "Nuevo pedido", icon: ShoppingCartSimple, path: "/sales" },
  { label: "Nuevo cliente", icon: UserPlus, path: "/contacts" },
  { label: "Nueva compra", icon: Truck, path: "/purchasing" },
  { label: "Nuevo producto", icon: Package, path: "/catalog" },
];

interface QuickActionsWidgetProps {
  navigate: (path: AppPath) => void;
}

export function QuickActionsWidget({ navigate }: QuickActionsWidgetProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTIONS.map((action) => (
        <button
          key={action.path + action.label}
          type="button"
          onClick={() => navigate(action.path)}
          className="flex items-center gap-2 rounded-[9px] border border-[var(--line)] px-3 py-2.5 text-left text-[12.5px] font-bold text-[var(--ink)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-soft-text)]"
        >
          <action.icon size={16} weight="bold" aria-hidden="true" className="shrink-0" />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
      <span className="col-span-2 mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-[var(--muted)]">
        <PlusCircle size={12} aria-hidden="true" />
        Ctrl+K también busca acciones y registros.
      </span>
    </div>
  );
}
