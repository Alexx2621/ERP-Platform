import { ArrowRight, Buildings, CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { BrandMark } from "../../shared/ui/brand-mark";

const assurances = [
  { icon: ShieldCheck, label: "Sesiones rotativas y seguras" },
  { icon: Buildings, label: "Aislamiento estricto por tenant" },
  { icon: CheckCircle, label: "Operación trazable desde el inicio" },
];

export function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)] lg:grid lg:grid-cols-[minmax(0,1.04fr)_minmax(440px,0.96fr)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden border-r border-[var(--line)] bg-[var(--ink)] p-10 text-[var(--paper)] lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -bottom-44 -right-20 size-[30rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-16 size-[19rem] rounded-full border border-[var(--accent)]/35" />

        <div className="relative flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--paper)] text-[12px] font-extrabold tracking-[-0.05em] text-[var(--ink)]">
            ER
          </span>
          <span className="text-[13px] font-extrabold tracking-[-0.025em]">ERP Platform</span>
        </div>

        <div className="relative max-w-[610px]">
          <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-light)]">
            Operación conectada
          </p>
          <h1 className="max-w-[12ch] text-[clamp(2.5rem,4.8vw,5.2rem)] font-extrabold leading-[0.96] tracking-[-0.065em]">
            Una base sólida para dirigir cada operación.
          </h1>
          <p className="mt-7 max-w-[52ch] text-[15px] font-medium leading-7 text-white/62">
            Identidad, organizaciones y contexto empresarial reunidos en un espacio de trabajo claro
            y confiable.
          </p>
        </div>

        <ul className="relative flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-bold text-white/65">
          {assurances.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon
                size={16}
                weight="bold"
                className="text-[var(--accent-light)]"
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-9 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between lg:hidden">
          <BrandMark />
          <ArrowRight size={18} className="text-[var(--muted)]" aria-hidden="true" />
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 items-center py-14">
          {children}
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          Entorno empresarial protegido
        </p>
      </section>
    </main>
  );
}
