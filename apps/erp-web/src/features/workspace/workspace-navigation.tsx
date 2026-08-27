import {
  ClipboardText,
  HouseLine,
  ShieldCheck,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { AppPath } from "../../shared/navigation/router";

type WorkspacePath = Extract<AppPath, "/workspace" | "/roles" | "/settings" | "/audit">;

interface WorkspaceNavigationProps {
  activePath: WorkspacePath;
  navigate: (path: AppPath, replace?: boolean) => void;
}

interface NavigationItem {
  path: WorkspacePath;
  label: string;
  icon: ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: "true" }>;
}

const navigationItems: NavigationItem[] = [
  { path: "/workspace", label: "Resumen", icon: HouseLine },
  { path: "/roles", label: "Roles y permisos", icon: ShieldCheck },
  { path: "/settings", label: "Ajustes", icon: SlidersHorizontal },
  { path: "/audit", label: "Auditoría", icon: ClipboardText },
];

export function WorkspaceNavigation({ activePath, navigate }: WorkspaceNavigationProps) {
  return (
    <nav aria-label="Navegación del espacio" className="overflow-x-auto overscroll-x-contain">
      <div className="flex min-w-max gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-1.5">
        {navigationItems.map(({ path, label, icon: Icon }) => {
          const active = path === activePath;
          return (
            <button
              key={path}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(path)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[9px] px-3.5 text-[12px] font-extrabold transition-[color,background-color,transform] duration-150 active:translate-y-px ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted-strong)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon size={16} weight="bold" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
