import { ArrowLeft, Power, SquaresFour } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { TenantAppResponse, TenantSummary } from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { ErrorNotice } from "../../shared/ui/notice";
import { LoadingRows } from "../../shared/ui/loading-rows";
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

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface AppsPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

const KIND_LABELS: Record<TenantAppResponse["kind"], string> = {
  BUSINESS_APP: "App de negocio",
  CHANNEL: "Canal",
  INTEGRATION: "Integración",
  INDUSTRY_EXTENSION: "Extensión de industria",
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function AppsPage({ selection, navigate }: AppsPageProps) {
  const { getAccessToken } = useAuth();
  const [apps, setApps] = useState<TenantAppResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.listTenantApps(accessToken, selection.slug, signal);
        setApps([...result].sort((left, right) => left.key.localeCompare(right.key)));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggle = async (app: TenantAppResponse) => {
    setActionError(undefined);
    setPendingKey(app.key);
    try {
      const accessToken = await getAccessToken();
      const updated =
        app.status === "ENABLED"
          ? await apiClient.disableApp(accessToken, selection.slug, app.key)
          : await apiClient.enableApp(accessToken, selection.slug, app.key);
      setApps((current) =>
        (current ?? []).map((existing) => (existing.key === updated.key ? updated : existing)),
      );
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setPendingKey(undefined);
    }
  };

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Apps"
      description="Activa o desactiva las apps oficiales disponibles para este tenant. Las dependencias deben habilitarse primero."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <div className="pt-7">
        {actionError ? (
          <div className="mb-5">
            <ErrorNotice message={actionError} />
          </div>
        ) : null}
        {error ? (
          <div className="grid gap-3">
            <ErrorNotice message={error} />
            <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <Table aria-busy={apps === null}>
            <TableCaption>Catálogo de apps y su estado para este tenant</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">App</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Dependencias</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps === null ? (
                <LoadingRows columns={5} />
              ) : apps.length === 0 ? (
                <TableRow>
                  <TableEmpty
                    colSpan={5}
                    title="Todavía no hay apps en el catálogo"
                    description="Las apps oficiales aparecerán aquí cuando la plataforma agregue módulos de negocio más allá del Core."
                  />
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.key}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <SquaresFour
                          size={17}
                          weight="duotone"
                          className="text-[var(--accent)]"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="block text-[12px] font-extrabold">{app.name}</span>
                          <code className="text-[10px] font-bold text-[var(--muted)]">{app.key}</code>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] font-semibold text-[var(--muted-strong)]">
                      {KIND_LABELS[app.kind]}
                    </TableCell>
                    <TableCell>
                      {app.dependsOnKeys.length === 0 ? (
                        <span className="text-[11px] font-medium text-[var(--muted)]">Ninguna</span>
                      ) : (
                        <span className="font-mono text-[10px] text-[var(--muted-strong)]">
                          {app.dependsOnKeys.join(", ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${app.status === "ENABLED" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                      >
                        {app.status === "ENABLED" ? "Habilitada" : "Deshabilitada"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={app.status === "ENABLED" ? "quiet" : "secondary"}
                        className="h-9 px-3"
                        busy={pendingKey === app.key}
                        aria-label={
                          app.status === "ENABLED" ? `Deshabilitar ${app.name}` : `Habilitar ${app.name}`
                        }
                        onClick={() => void toggle(app)}
                      >
                        <Power size={16} weight="bold" aria-hidden="true" />
                        {app.status === "ENABLED" ? "Deshabilitar" : "Habilitar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </ProductShell>
  );
}
