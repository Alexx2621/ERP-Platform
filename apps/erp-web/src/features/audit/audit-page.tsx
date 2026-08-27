import {
  ArrowClockwise,
  ArrowLeft,
  Eye,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { AuditEntryResponse, TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { ProductShell } from "../workspace/product-shell";
import { WorkspaceNavigation } from "../workspace/workspace-navigation";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface AuditPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

const limitOptions = [25, 50, 100, 200] as const;

const actionLabels: Record<string, string> = {
  "tenant.provisioned": "Espacio creado",
  "access_control.owner_role.seeded": "Rol Owner inicializado",
  "access_control.role.created": "Rol creado",
  "access_control.role_assignment.created": "Rol asignado",
  "configuration.setting.changed": "Ajuste modificado",
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSnapshot(value: unknown): string {
  if (value === null || value === undefined) return "Sin datos";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, rowIndex) => (
    <TableRow key={rowIndex} aria-hidden="true">
      {Array.from({ length: 5 }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <span className="block h-3.5 max-w-40 animate-pulse rounded bg-[var(--line)]" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function MetadataItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-[11px] font-semibold text-[var(--ink)]">
        {value ?? "No disponible"}
      </dd>
    </div>
  );
}

function Snapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="text-[12px] font-extrabold text-[var(--ink)]">{title}</h3>
      <pre className="mt-2 max-h-60 overflow-auto rounded-[10px] border border-[var(--line)] bg-[var(--field)] p-3 font-mono text-[11px] leading-5 text-[var(--muted-strong)]">
        {formatSnapshot(value)}
      </pre>
    </section>
  );
}

function AuditDetailModal({
  entry,
  onOpenChange,
}: {
  entry: AuditEntryResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={Boolean(entry)}
      onOpenChange={onOpenChange}
      title={entry ? (actionLabels[entry.action] ?? entry.action) : "Detalle de auditoría"}
      description="Registro append-only capturado por el backend para el tenant activo."
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      }
    >
      {entry ? (
        <div className="grid gap-6">
          <dl className="grid gap-4 rounded-[10px] border border-[var(--line)] bg-[var(--field-hover)] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetadataItem label="Fecha" value={formatDate(entry.createdAt)} />
            <MetadataItem label="Acción" value={entry.action} />
            <MetadataItem label="Recurso" value={entry.resource} />
            <MetadataItem label="ID del recurso" value={entry.resourceId} />
            <MetadataItem label="Usuario" value={entry.userId} />
            <MetadataItem label="Empresa" value={entry.companyId} />
            <MetadataItem label="Dirección IP" value={entry.ipAddress} />
            <MetadataItem label="Correlation ID" value={entry.correlationId} />
            <MetadataItem label="User agent" value={entry.userAgent} />
          </dl>
          <div className="grid gap-5 lg:grid-cols-2">
            <Snapshot title="Valores anteriores" value={entry.previousValues} />
            <Snapshot title="Valores nuevos" value={entry.newValues} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function AuditPage({ selection, navigate }: AuditPageProps) {
  const { getAccessToken } = useAuth();
  const [entries, setEntries] = useState<AuditEntryResponse[] | null>(null);
  const [limit, setLimit] = useState<(typeof limitOptions)[number]>(50);
  const [error, setError] = useState<string>();
  const [selectedEntry, setSelectedEntry] = useState<AuditEntryResponse | null>(null);

  const loadEntries = useCallback(
    async (signal?: AbortSignal) => {
      setEntries(null);
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setEntries(await apiClient.listAuditEntries(accessToken, selection.slug, limit, signal));
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(getErrorMessage(loadError));
      }
    },
    [getAccessToken, limit, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadEntries(controller.signal);
    return () => controller.abort();
  }, [loadEntries]);

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Auditoría"
      description="Consulta acciones críticas registradas para el tenant activo y revisa sus cambios sin exponer actividad global."
      navigation={<WorkspaceNavigation activePath="/audit" navigate={navigate} />}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <section aria-labelledby="audit-list-title" className="grid gap-5 pt-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="audit-list-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
              Actividad del tenant
            </h2>
            <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
              Los registros más recientes aparecen primero. El backend limita la consulta a 200.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              name="auditLimit"
              label="Registros mostrados"
              value={String(limit)}
              className="sm:w-44"
              onChange={(event) =>
                setLimit(Number(event.target.value) as (typeof limitOptions)[number])
              }
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadEntries()}
              disabled={entries === null}
            >
              <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
              Actualizar
            </Button>
          </div>
        </div>

        {error ? (
          <div className="grid gap-3">
            <ErrorNotice message={error} />
            <Button
              type="button"
              variant="secondary"
              className="w-fit"
              onClick={() => void loadEntries()}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {entries === null
                ? "Cargando actividad"
                : `${entries.length} registros de auditoría cargados`}
            </p>
            <Table
              aria-busy={entries === null}
              scrollLabel="Actividad del tenant, desplázate horizontalmente para ver todas las columnas"
            >
              <TableCaption>Actividad de auditoría del tenant activo</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Fecha</TableHead>
                  <TableHead scope="col">Acción</TableHead>
                  <TableHead scope="col">Recurso</TableHead>
                  <TableHead scope="col">Usuario</TableHead>
                  <TableHead scope="col" className="text-right">
                    Detalle
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries === null ? (
                  <LoadingRows />
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableEmpty
                      colSpan={5}
                      title="No hay actividad registrada"
                      description="Las acciones auditables del tenant aparecerán aquí cuando ocurran."
                    />
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                      </TableCell>
                      <TableCell>
                        <span className="block font-extrabold">
                          {actionLabels[entry.action] ?? entry.action}
                        </span>
                        <code className="mt-1 block text-[10px] font-semibold text-[var(--muted)]">
                          {entry.action}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="block">{entry.resource}</span>
                        {entry.resourceId ? (
                          <code className="mt-1 block max-w-52 truncate text-[10px] text-[var(--muted)]">
                            {entry.resourceId}
                          </code>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <code className="block max-w-48 truncate text-[10px]">
                          {entry.userId ?? "Sistema"}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="quiet"
                          className="min-h-9 px-3 py-1"
                          aria-label={`Ver detalle de ${entry.action}`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye size={16} weight="bold" aria-hidden="true" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}

        <aside className="flex items-start gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-4 text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
          <ShieldCheck
            size={19}
            weight="duotone"
            className="mt-0.5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-extrabold text-[var(--ink)]">Alcance protegido</p>
            <p className="mt-1 max-w-[82ch]">
              Esta vista sólo consulta entradas del tenant activo. Los eventos globales de
              autenticación y administración de plataforma no forman parte de este endpoint.
            </p>
          </div>
        </aside>
      </section>

      <AuditDetailModal
        entry={selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      />
    </ProductShell>
  );
}
