import { WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[10px] border border-[var(--danger-line)] bg-[var(--danger-soft)] px-3.5 py-3 text-[13px] font-semibold leading-5 text-[var(--danger)]"
    >
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/**
 * "You need to set something up first" — a prerequisite a module needs
 * before it can be used (a customer before selling, a warehouse before
 * moving stock). Deliberately NOT an ErrorNotice: nothing failed, the
 * company simply hasn't created that record yet, and a red danger banner
 * on a brand-new company's very first visit reads as a broken screen.
 * Takes an `action` so the prerequisite is one click away instead of just
 * naming the module the user has to go find.
 */
export function SetupNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[14px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 py-14 text-center">
      <p className="text-[15px] font-extrabold text-[var(--ink)]">{title}</p>
      <p className="max-w-[52ch] text-[12.5px] font-medium leading-5 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
