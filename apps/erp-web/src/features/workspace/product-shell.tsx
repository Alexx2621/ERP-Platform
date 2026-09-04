import { List, ShieldCheck, SignOut, UserCircle, X } from "@phosphor-icons/react";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import { useAppearance } from "../../shared/appearance/appearance-context";
import { useAuth } from "../../shared/auth/auth-context";
import { moduleNavSections } from "../../shared/navigation/module-nav";
import type { AppPath } from "../../shared/navigation/router";
import { BrandMark } from "../../shared/ui/brand-mark";
import { Button } from "../../shared/ui/button";
import { NavDropdown } from "../../shared/ui/nav-dropdown";

interface ProductShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** When provided and the current user is a platform admin, shows a persistent link to /platform-admin. */
  navigate?: (path: AppPath, replace?: boolean) => void;
}

/** Routes with no tenant/company context yet — the module sidebar makes no sense there. */
const ROUTES_WITHOUT_NAV = new Set<AppPath>(["/tenants", "/onboarding"]);

export function ProductShell({
  eyebrow,
  title,
  description,
  action,
  navigate,
  children,
}: PropsWithChildren<ProductShellProps>) {
  const { session, logout } = useAuth();
  const { navigationLayout } = useAppearance();
  const isNavbarLayout = navigationLayout === "navbar";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Every real navigation swaps in a different page component (see
  // App()'s path -> component switch), so ProductShell always remounts
  // fresh on route change — reading the URL once at render time is
  // therefore always current, with no popstate listener needed here.
  const currentPath = typeof window !== "undefined" ? (window.location.pathname as AppPath) : undefined;
  const showNav = Boolean(navigate) && !ROUTES_WITHOUT_NAV.has(currentPath as AppPath);

  const sections = session?.user.isPlatformAdmin
    ? moduleNavSections.map((section, index) =>
        index === moduleNavSections.length - 1
          ? {
              ...section,
              items: [...section.items, { path: "/platform-admin" as AppPath, label: "Plataforma", icon: ShieldCheck }],
            }
          : section,
      )
    : moduleNavSections;

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--nav-line)] px-5">
        <BrandMark tone="nav" />
      </div>
      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--nav-muted)]">
              {section.label}
            </p>
            <ul className="grid gap-0.5">
              {section.items.map((item) => {
                const active = item.path === currentPath;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileNavOpen(false);
                        navigate?.(item.path);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold transition-colors duration-150 ${
                        active
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "text-[var(--nav-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
                      }`}
                    >
                      <item.icon
                        size={18}
                        weight={active ? "fill" : "regular"}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--nav-line)] p-3">
        <button
          type="button"
          onClick={() => navigate?.("/tenants")}
          className="flex h-10 w-full items-center justify-start gap-2.5 rounded-[8px] px-2.5 text-[12px] font-bold text-[var(--nav-muted)] transition-colors duration-150 hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
        >
          Cambiar espacio
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      {showNav && !isNavbarLayout ? (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--nav-line)] bg-[var(--nav-bg)] lg:flex">
          {sidebarContent}
        </aside>
      ) : null}

      {showNav && mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[var(--nav-bg)] shadow-[var(--shadow-lg)]">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-[8px] text-[var(--nav-muted)] hover:bg-[var(--nav-hover)]"
            >
              <X size={18} weight="bold" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          {showNav && isNavbarLayout ? (
            <div className="hidden border-b border-[var(--nav-line)] bg-[var(--nav-bg)] lg:block">
              <nav
                aria-label="Módulos"
                className="flex min-h-14 flex-wrap items-center gap-1 px-4 py-1.5 sm:px-6"
              >
                <div className="mr-2 shrink-0">
                  <BrandMark tone="nav" />
                </div>
                {sections.map((section) =>
                  section.items.length === 1 ? (
                    section.items.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate?.(item.path)}
                        aria-current={item.path === currentPath ? "page" : undefined}
                        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-bold transition-colors duration-150 ${
                          item.path === currentPath
                            ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "text-[var(--nav-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
                        }`}
                      >
                        <item.icon size={16} aria-hidden="true" />
                        {item.label}
                      </button>
                    ))
                  ) : (
                    <NavDropdown
                      key={section.label}
                      label={section.label}
                      items={section.items.map((item) => ({
                        key: item.path,
                        active: item.path === currentPath,
                        onSelect: () => navigate?.(item.path),
                        label: (
                          <span className="flex items-center gap-2.5">
                            <item.icon size={16} aria-hidden="true" />
                            {item.label}
                          </span>
                        ),
                      }))}
                    />
                  ),
                )}
                <div className="ml-auto shrink-0 pl-2">
                  <button
                    type="button"
                    onClick={() => navigate?.("/tenants")}
                    className="flex h-9 items-center rounded-[8px] px-3 text-[12px] font-bold text-[var(--nav-muted)] transition-colors duration-150 hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
                  >
                    Cambiar espacio
                  </button>
                </div>
              </nav>
            </div>
          ) : null}

          <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--paper)]/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {showNav ? (
                <button
                  type="button"
                  aria-label="Abrir menú"
                  onClick={() => setMobileNavOpen(true)}
                  className="grid size-9 shrink-0 place-items-center rounded-[8px] text-[var(--muted-strong)] hover:bg-[var(--field-hover)] lg:hidden"
                >
                  <List size={20} weight="bold" aria-hidden="true" />
                </button>
              ) : (
                <BrandMark />
              )}
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="truncate text-[17px] font-extrabold tracking-[-0.015em] sm:text-[19px]">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {navigate && session?.user.isPlatformAdmin ? (
                <Button
                  type="button"
                  variant="quiet"
                  className="h-9 gap-1.5 px-2.5 sm:px-3"
                  onClick={() => navigate("/platform-admin")}
                >
                  <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
                  <span className="hidden sm:inline">Plataforma</span>
                </Button>
              ) : null}
              <div className="hidden items-center gap-2 border-l border-[var(--line)] pl-3 text-right sm:flex">
                <UserCircle size={19} weight="duotone" className="text-[var(--muted)]" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-extrabold leading-4">{session?.user.displayName}</p>
                  <p className="max-w-[180px] truncate text-[10px] font-semibold text-[var(--muted)]">
                    {session?.user.email}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="quiet"
                className="size-9 px-0"
                onClick={() => void logout()}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <SignOut size={17} weight="bold" aria-hidden="true" />
              </Button>
            </div>
          </header>
        </div>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {description || action ? (
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {description ? (
                <p className="max-w-[64ch] text-[13px] font-medium leading-6 text-[var(--muted-strong)]">
                  {description}
                </p>
              ) : (
                <div />
              )}
              {action}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
