import {
  Calculator,
  Coins,
  Factory,
  Globe,
  Package,
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

export interface ModuleNavItem {
  path: AppPath;
  label: string;
  icon: Icon;
}

export interface ModuleNavSection {
  label: string;
  items: ModuleNavItem[];
}

/**
 * Single source of truth for the sidebar navigation and the workspace home
 * launchpad tiles — grouped the way SAP Business One groups its own left
 * module menu, so both surfaces stay in sync automatically.
 */
export const moduleNavSections: ModuleNavSection[] = [
  {
    label: "General",
    items: [{ path: "/workspace", label: "Inicio", icon: SquaresFour }],
  },
  {
    label: "Ventas y clientes",
    items: [
      { path: "/sales", label: "Ventas", icon: ShoppingCartSimple },
      { path: "/pos", label: "Punto de venta", icon: Coins },
      { path: "/commerce", label: "Comercio", icon: Globe },
      { path: "/crm", label: "CRM", icon: Target },
      { path: "/contacts", label: "Contactos", icon: Users },
    ],
  },
  {
    label: "Compras e inventario",
    items: [
      { path: "/purchasing", label: "Compras", icon: Truck },
      { path: "/inventory", label: "Inventario", icon: Package },
      { path: "/catalog", label: "Catálogo", icon: TShirt },
      { path: "/commercial", label: "Comercial", icon: Wallet },
    ],
  },
  {
    label: "Producción y finanzas",
    items: [
      { path: "/manufacturing", label: "Manufactura", icon: Factory },
      { path: "/accounting", label: "Contabilidad", icon: Calculator },
    ],
  },
  {
    label: "Administración",
    items: [
      { path: "/apps", label: "Apps", icon: Storefront },
      { path: "/roles", label: "Roles y permisos", icon: ShieldCheck },
      { path: "/settings", label: "Ajustes", icon: SlidersHorizontal },
    ],
  },
];

export const moduleNavItems: ModuleNavItem[] = moduleNavSections.flatMap(
  (section) => section.items,
);
