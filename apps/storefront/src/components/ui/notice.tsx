import type { PropsWithChildren } from "react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[10px] border border-[var(--danger-line)] bg-[var(--danger-soft)] px-4 py-3.5 text-[14px] font-semibold leading-6 text-[var(--danger)]"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        ⚠
      </span>
      <span>{message}</span>
    </div>
  );
}

export function SuccessBanner({ children }: PropsWithChildren) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-[10px] border border-[var(--accent-light)] bg-[var(--accent-soft)] px-4 py-3.5 text-[14px] font-semibold leading-6 text-[var(--accent-hover)]"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}

export function InfoNotice({ children }: PropsWithChildren) {
  return (
    <div
      role="status"
      className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3.5 text-[13px] leading-6 text-[var(--muted-strong)]"
    >
      {children}
    </div>
  );
}
