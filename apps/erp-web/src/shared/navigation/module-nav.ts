import {
  Calculator,
  Coins,
  Factory,
  Globe,
  Package,
  PaintBrush,
  ShieldCheck,
  ShoppingCartSimple,
  SlidersHorizontal,
  SquaresFour,
  Storefront,
  Target,
  Truck,
  TShirt,
  Users,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import type { AppPath } from "./router";
import { TONE } from "../ui/tone-colors";

export interface ModuleNavItem {
  path: AppPath;
  label: string;
  icon: Icon;
  /**
   * Fixed, theme-independent icon color — each module gets its own
   * identity instead of every nav icon sharing the single user-chosen
   * accent color (see `shared/ui/tone-colors.ts`). Only applied while the
   * item is inactive; the active item already stands out via a solid
   * accent-colored background.
   */
  color: string;
}

export interface ModuleNavSection {
  label: string;
  items: ModuleNavItem[];
}

/**
 * Single source of truth for module navigation — consumed by ProductShell's
 * sidebar (layout: "sidebar") and its category dropdowns (layout: "navbar"),
 * grouped the way SAP Business One groups its own module menu so both
 * surfaces stay in sync automatically.
 */
export const moduleNavSections: ModuleNavSection[] = [
  {
    label: "General",
    items: [{ path: "/workspace", label: "Inicio", icon: SquaresFour, color: TONE.sky }],
  },
  {
    label: "Ventas y clientes",
    items: [
      { path: "/sales", label: "Ventas", icon: ShoppingCartSimple, color: TONE.blue },
      { path: "/pos", label: "Punto de venta", icon: Coins, color: TONE.orange },
      { path: "/commerce", label: "Comercio", icon: Globe, color: TONE.cyan },
      { path: "/crm", label: "CRM", icon: Target, color: TONE.pink },
      { path: "/contacts", label: "Contactos", icon: Users, color: TONE.violet },
    ],
  },
  {
    label: "Compras e inventario",
    items: [
      { path: "/purchasing", label: "Compras", icon: Truck, color: TONE.green },
      { path: "/inventory", label: "Inventario", icon: Package, color: TONE.amber },
      { path: "/catalog", label: "Catálogo", icon: TShirt, color: TONE.indigo },
      { path: "/commercial", label: "Comercial", icon: Wallet, color: TONE.teal },
    ],
  },
  {
    label: "Producción y finanzas",
    items: [
      { path: "/manufacturing", label: "Manufactura", icon: Factory, color: TONE.red },
      { path: "/accounting", label: "Contabilidad", icon: Calculator, color: TONE.emerald },
    ],
  },
  {
    label: "Administración",
    items: [
      { path: "/apps", label: "Apps", icon: Storefront, color: TONE.fuchsia },
      { path: "/roles", label: "Roles y permisos", icon: ShieldCheck, color: TONE.rose },
      { path: "/settings", label: "Ajustes", icon: SlidersHorizontal, color: TONE.slate },
      { path: "/appearance", label: "Apariencia", icon: PaintBrush, color: TONE.purple },
    ],
  },
];

export const moduleNavItems: ModuleNavItem[] = moduleNavSections.flatMap(
  (section) => section.items,
);
