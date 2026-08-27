import {
  ArrowLeft,
  Buildings,
  CheckCircle,
  Factory,
  LockKey,
  SquaresFour,
} from "@phosphor-icons/react";
import type { TenantSummary } from "@erp/api-client";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { DevelopmentProgressPanel } from "./development-progress-panel";
import { ProductShell } from "./product-shell";
import { WorkspaceNavigation } from "./workspace-navigation";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface WorkspacePageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

const foundationItems = [
  { icon: CheckCircle, label: "Sesión activa", value: "Verificada" },
  { icon: Buildings, label: "Tenant", value: "Resuelto" },
  { icon: Factory, label: "Empresa", value: "Contextual" },
  { icon: LockKey, label: "Aislamiento", value: "Aplicado" },
];

export function WorkspacePage({ selection, navigate }: WorkspacePageProps) {
  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title={selection.name}
      description="El contexto empresarial está listo. Los módulos operativos aparecerán cuando sus permisos y contratos HTTP estén disponibles."
      navigation={<WorkspaceNavigation activePath="/workspace" navigate={navigate} />}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/tenants")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Cambiar espacio
        </Button>
      }
    >
      <section className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--accent)] text-white">
              <SquaresFour size={22} weight="fill" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                Workspace base
              </p>
              <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.04em]">
                Preparado para los módulos ERP
              </h2>
              <p className="mt-3 max-w-[56ch] text-[13px] font-medium leading-6 text-[var(--muted-strong)]">
                Esta pantalla confirma el flujo completo de identidad, selección de tenant y entrada
                segura al contexto de trabajo. La administración de acceso ya está disponible con
                los contratos RBAC vigentes.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {foundationItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 bg-[var(--field)] px-4 py-4"
              >
                <span className="flex items-center gap-2.5 text-[12px] font-bold text-[var(--muted-strong)]">
                  <Icon
                    size={17}
                    weight="duotone"
                    className="text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Contexto activo
          </p>
          <dl className="mt-5 grid gap-5">
            <div>
              <dt className="text-[11px] font-bold text-[var(--muted)]">Tenant ID</dt>
              <dd className="mt-1 break-all font-mono text-[11px] font-semibold text-[var(--ink)]">
                {selection.tenantId}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold text-[var(--muted)]">Membresía</dt>
              <dd className="mt-1 break-all font-mono text-[11px] font-semibold text-[var(--ink)]">
                {selection.membershipId}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold text-[var(--muted)]">Empresa</dt>
              <dd className="mt-1 break-all font-mono text-[11px] font-semibold text-[var(--ink)]">
                {selection.companyId ?? "Sin selección específica"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
      <DevelopmentProgressPanel />
    </ProductShell>
  );
}
