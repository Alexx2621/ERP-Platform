import { ShieldCheck, SignOut, UserCircle } from "@phosphor-icons/react";
import type { PropsWithChildren, ReactNode } from "react";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { BrandMark } from "../../shared/ui/brand-mark";
import { Button } from "../../shared/ui/button";

interface ProductShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** When provided and the current user is a platform admin, shows a persistent link to /platform-admin. */
  navigate?: (path: AppPath, replace?: boolean) => void;
}

export function ProductShell({
  eyebrow,
  title,
  description,
  action,
  navigate,
  children,
}: PropsWithChildren<ProductShellProps>) {
  const { session, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex h-17 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <BrandMark />
          <div className="flex items-center gap-2 sm:gap-4">
            {navigate && session?.user.isPlatformAdmin ? (
              <Button
                type="button"
                variant="quiet"
                className="h-10 gap-1.5 px-3"
                onClick={() => navigate("/platform-admin")}
              >
                <ShieldCheck size={17} weight="duotone" aria-hidden="true" />
                <span className="hidden sm:inline">Plataforma</span>
              </Button>
            ) : null}
            <div className="hidden items-center gap-2.5 text-right sm:flex">
              <UserCircle
                size={20}
                weight="duotone"
                className="text-[var(--muted)]"
                aria-hidden="true"
              />
              <div>
                <p className="text-[12px] font-extrabold leading-4">{session?.user.displayName}</p>
                <p className="max-w-[220px] truncate text-[10px] font-semibold text-[var(--muted)]">
                  {session?.user.email}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="quiet"
              className="size-10 px-0"
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <SignOut size={18} weight="bold" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow ? (
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[var(--accent)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] font-extrabold leading-none tracking-[-0.06em]">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-[64ch] text-[14px] font-medium leading-6 text-[var(--muted-strong)]">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}
