import { WarningCircle } from "@phosphor-icons/react";

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
