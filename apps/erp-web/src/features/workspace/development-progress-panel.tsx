import { ChartDonut, ClockCountdown } from "@phosphor-icons/react";

interface RoadmapPhase {
  id: string;
  name: string;
  progress: number;
}

// Temporary, manually maintained snapshot. Keep it aligned with MASTER_SPEC,
// PROJECT_STATE and WORK_QUEUE until a real delivery-tracking source exists.
export const developmentRoadmap: readonly RoadmapPhase[] = [
  { id: "phase-0", name: "Arquitectura", progress: 85 },
  { id: "phase-1", name: "Foundation", progress: 78 },
  { id: "phase-2", name: "Master Data", progress: 0 },
  { id: "phase-3", name: "Inventario", progress: 0 },
  { id: "phase-4", name: "Ventas", progress: 0 },
  { id: "phase-5", name: "Compras", progress: 0 },
  { id: "phase-6", name: "POS", progress: 0 },
  { id: "phase-7", name: "E-commerce", progress: 0 },
  { id: "phase-8", name: "Contabilidad", progress: 0 },
  { id: "phase-9", name: "CRM", progress: 0 },
  { id: "phase-10", name: "Manufactura", progress: 0 },
  { id: "phase-11", name: "Plataforma de plugins", progress: 0 },
  { id: "phase-12", name: "Escala", progress: 0 },
] as const;

export const overallDevelopmentProgress = Math.round(
  developmentRoadmap.reduce((total, phase) => total + phase.progress, 0) /
    developmentRoadmap.length,
);

const nextMilestones = ["App Registry mínimo (antes de Master Data)"] as const;

function ProgressMeter({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function DevelopmentProgressPanel() {
  return (
    <section
      className="mt-6 overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper)]"
      aria-labelledby="development-progress-title"
    >
      <div className="grid border-b border-[var(--line)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="bg-[var(--accent-soft)] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <ChartDonut size={20} weight="duotone" aria-hidden="true" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
              Estimación temporal
            </p>
          </div>
          <p className="mt-6 font-mono text-[54px] font-extrabold leading-none tracking-[-0.08em] text-[var(--ink)]">
            {overallDevelopmentProgress}%
          </p>
          <p className="mt-3 text-[12px] font-bold text-[var(--muted-strong)]">
            Roadmap total del producto
          </p>
          <div className="mt-5">
            <ProgressMeter label="Avance total estimado" value={overallDevelopmentProgress} />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="development-progress-title"
                className="text-[22px] font-extrabold tracking-[-0.04em]"
              >
                Avance del desarrollo
              </h2>
              <p className="mt-2 max-w-[62ch] text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
                Vista orientativa del alcance completo definido en el roadmap. Se actualiza
                manualmente al integrar bloques estables en develop.
              </p>
            </div>
            <div className="shrink-0 rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
              <p className="text-[10px] font-bold text-[var(--muted)]">Fase activa</p>
              <p className="mt-1 font-mono text-[18px] font-extrabold text-[var(--ink)]">
                Foundation 78%
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2" aria-label="Fases del roadmap">
            {developmentRoadmap.map((phase) => (
              <div key={phase.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-[var(--muted-strong)]">
                    {phase.name}
                  </span>
                  <span className="font-mono text-[10px] font-extrabold text-[var(--ink)]">
                    {phase.progress}%
                  </span>
                </div>
                <ProgressMeter label={`Avance de ${phase.name}`} value={phase.progress} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
        <div>
          <div className="flex items-center gap-2">
            <ClockCountdown
              size={18}
              weight="duotone"
              className="text-[var(--accent)]"
              aria-hidden="true"
            />
            <h3 className="text-[13px] font-extrabold">Próximos hitos de Foundation</h3>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {nextMilestones.map((milestone, index) => (
              <li
                key={milestone}
                className="flex items-center gap-3 rounded-[10px] bg-[var(--field)] px-4 py-3"
              >
                <span className="font-mono text-[9px] font-extrabold text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-bold text-[var(--muted-strong)]">
                  {milestone}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="border-t border-[var(--line)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[11px] font-extrabold text-[var(--ink)]">Cómo se calcula</p>
          <p className="mt-2 text-[11px] font-medium leading-5 text-[var(--muted-strong)]">
            Promedio simple de las 13 fases de MASTER_SPEC. Arquitectura está al 85% y Foundation al
            78%; las fases funcionales futuras permanecen en 0%.
          </p>
          <p className="mt-3 text-[10px] font-semibold leading-4 text-[var(--muted)]">
            No representa horas, presupuesto ni fecha de entrega. Es un indicador interno para
            seguimiento visual.
          </p>
        </aside>
      </div>
    </section>
  );
}
