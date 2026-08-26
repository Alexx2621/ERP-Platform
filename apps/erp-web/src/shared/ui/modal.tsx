import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const widthClass = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
  }[size];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      className={`m-auto w-[calc(100%-2rem)] ${widthClass} rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper)] p-0 text-[var(--ink)] shadow-[0_24px_80px_rgba(10,20,16,0.24)] backdrop:bg-[var(--overlay)] backdrop:backdrop-blur-[2px]`}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-5 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-[18px] font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1.5 max-w-[56ch] text-[12px] font-medium leading-5 text-[var(--muted-strong)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => onOpenChange(false)}
            className="grid size-9 shrink-0 place-items-center rounded-[10px] text-[var(--muted-strong)] transition-colors duration-150 hover:bg-[var(--field-hover)] hover:text-[var(--ink)] active:translate-y-px"
          >
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[min(68dvh,640px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] bg-[var(--field-hover)] px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
