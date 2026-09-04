import {
  ArrowLeft,
  CheckCircle,
  ClockCounterClockwise,
  GearSix,
  PencilSimple,
  Prohibit,
  ShieldCheck,
  UserCircle,
  Users,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  AuditEntryResponse,
  PlatformSettingResponse,
  PlatformUserResponse,
  SettingDefinitionResponse,
  UserStatus,
} from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { formatDateTime } from "../../shared/format/date";
import { Button } from "../../shared/ui/button";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
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
import { Tabs } from "../../shared/ui/tabs";
import { ValueEditor, formatValue, parseValue, serializeValue, typeLabel } from "../../shared/ui/value-editor";

interface PlatformAdminPageProps {
  navigate: (path: AppPath, replace?: boolean) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toggleStatus(status: UserStatus): UserStatus {
  return status === "ACTIVE" ? "DISABLED" : "ACTIVE";
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    "user.registered": "Registro de usuario",
    "auth.login.succeeded": "Inicio de sesión",
    "auth.login.failed": "Inicio de sesión fallido",
    "auth.logout": "Cierre de sesión",
    "auth.sessions.revoked_all": "Revocación de todas las sesiones",
    "user.status_changed": "Cambio de estado de usuario",
    "configuration.platform_setting.changed": "Cambio de ajuste de plataforma",
  };
  return labels[action] ?? action;
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

interface StatusModalState {
  user: PlatformUserResponse;
}

function StatusConfirmModal({
  state,
  onOpenChange,
  onConfirmed,
}: {
  state: StatusModalState | null;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (user: PlatformUserResponse) => void;
}) {
  const { getAccessToken } = useAuth();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setRequestError(undefined);
    setBusy(false);
  }, [state]);

  if (!state) return null;
  const nextStatus = toggleStatus(state.user.status);
  const isDisabling = nextStatus === "DISABLED";

  const confirm = async () => {
    setBusy(true);
    setRequestError(undefined);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setPlatformUserStatus(accessToken, state.user.id, {
        status: nextStatus,
      });
      onConfirmed(updated);
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(state)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={isDisabling ? `Deshabilitar a ${state.user.displayName}` : `Reactivar a ${state.user.displayName}`}
      description={
        isDisabling
          ? "La cuenta perderá acceso inmediatamente, incluso con una sesión ya iniciada."
          : "La cuenta podrá volver a iniciar sesión de inmediato."
      }
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" busy={busy} onClick={() => void confirm()}>
            {isDisabling ? "Deshabilitar cuenta" : "Reactivar cuenta"}
          </Button>
        </>
      }
    >
      {requestError ? <ErrorNotice message={requestError} /> : null}
      <p className="text-[13px] font-medium leading-6 text-[var(--muted-strong)]">
        {state.user.email}
      </p>
    </Modal>
  );
}

function UsersPanel() {
  const { getAccessToken } = useAuth();
  const [users, setUsers] = useState<PlatformUserResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setUsers(null);
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setUsers(await apiClient.listPlatformUsers(accessToken, 200, signal));
      } catch (err) {
        if (!isAbortError(err)) setError(getErrorMessage(err));
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section aria-labelledby="platform-users-title" className="grid gap-4">
      <div>
        <h2 id="platform-users-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
          Usuarios de la plataforma
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          Toda cuenta registrada, sin importar el tenant al que pertenezca.
        </p>
      </div>

      {statusMessage ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-3 text-[13px] font-semibold text-[var(--accent-soft-text)]"
        >
          <CheckCircle
            size={18}
            weight="fill"
            className="shrink-0 text-[var(--accent-soft-text)]"
            aria-hidden="true"
          />
          <span>{statusMessage}</span>
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
        <Table aria-busy={users === null}>
          <TableCaption>Usuarios registrados en la plataforma</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Usuario</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col">Plataforma</TableHead>
              <TableHead scope="col">Registrado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users === null ? (
              <LoadingRows columns={5} />
            ) : users.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="No hay usuarios registrados" />
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <UserCircle
                        size={18}
                        weight="duotone"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block font-bold">{user.displayName}</span>
                        <span className="block text-[11px] font-medium text-[var(--muted-strong)]">
                          {user.email}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
                        user.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Activo" : "Deshabilitado"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.isPlatformAdmin ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                        <ShieldCheck size={14} weight="fill" aria-hidden="true" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-[var(--muted-strong)]">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="quiet"
                      className="h-9 px-3"
                      aria-label={
                        user.status === "ACTIVE" ? `Deshabilitar a ${user.displayName}` : `Reactivar a ${user.displayName}`
                      }
                      onClick={() => setStatusModal({ user })}
                    >
                      {user.status === "ACTIVE" ? (
                        <Prohibit size={16} weight="bold" aria-hidden="true" />
                      ) : (
                        <CheckCircle size={16} weight="bold" aria-hidden="true" />
                      )}
                      {user.status === "ACTIVE" ? "Deshabilitar" : "Reactivar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <StatusConfirmModal
        state={statusModal}
        onOpenChange={(open) => !open && setStatusModal(null)}
        onConfirmed={(updated) => {
          setUsers((current) => (current ?? []).map((u) => (u.id === updated.id ? updated : u)));
          setStatusMessage(
            `${updated.displayName} quedó ${updated.status === "ACTIVE" ? "activo" : "deshabilitado"}.`,
          );
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Platform settings tab
// ---------------------------------------------------------------------------

interface SettingModalState {
  definition: SettingDefinitionResponse;
  current?: PlatformSettingResponse;
}

function PlatformSettingModal({
  state,
  onOpenChange,
  onSaved,
}: {
  state: SettingModalState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (setting: PlatformSettingResponse) => void;
}) {
  const { getAccessToken } = useAuth();
  const [rawValue, setRawValue] = useState("");
  const [valueError, setValueError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setRawValue(serializeValue(state.current?.value ?? state.definition.defaultValue, state.definition.dataType));
    setValueError(undefined);
    setRequestError(undefined);
    setBusy(false);
  }, [state]);

  if (!state) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseValue(rawValue, state.definition.dataType);
    setValueError(parsed.error);
    setRequestError(undefined);
    if (parsed.error) return;

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const saved = await apiClient.setPlatformSettingValue(accessToken, state.definition.key, {
        value: parsed.value,
      });
      onSaved({ key: saved.key, value: saved.value, source: "PLATFORM" });
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(state)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={`Editar ${state.definition.key}`}
      description="Este valor se convierte en el predeterminado que hereda cualquier tenant sin su propio override."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="platform-setting-form" busy={busy}>
            Guardar para toda la plataforma
          </Button>
        </>
      }
    >
      <form id="platform-setting-form" className="grid gap-5" onSubmit={(event) => void submit(event)}>
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <ValueEditor
          id="platform-setting-value"
          dataType={state.definition.dataType}
          value={rawValue}
          error={valueError}
          autoFocus
          onChange={(value) => {
            setRawValue(value);
            setValueError(undefined);
          }}
        />
      </form>
    </Modal>
  );
}

function PlatformSettingsPanel() {
  const { getAccessToken } = useAuth();
  const [definitions, setDefinitions] = useState<SettingDefinitionResponse[] | null>(null);
  const [settings, setSettings] = useState<PlatformSettingResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalState, setModalState] = useState<SettingModalState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setDefinitions(null);
      setSettings(null);
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [definitionsResult, settingsResult] = await Promise.all([
          apiClient.listPlatformSettingDefinitions(accessToken, signal),
          apiClient.listPlatformSettings(accessToken, signal),
        ]);
        setDefinitions(definitionsResult);
        setSettings(settingsResult);
      } catch (err) {
        if (!isAbortError(err)) setError(getErrorMessage(err));
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const settingByKey = new Map((settings ?? []).map((setting) => [setting.key, setting]));

  return (
    <section aria-labelledby="platform-settings-title" className="grid gap-4">
      <div>
        <h2 id="platform-settings-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
          Ajustes de plataforma
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          El valor que cualquier tenant hereda cuando no define su propio override.
        </p>
      </div>

      {statusMessage ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-3 text-[13px] font-semibold text-[var(--accent-soft-text)]"
        >
          <CheckCircle
            size={18}
            weight="fill"
            className="shrink-0 text-[var(--accent-soft-text)]"
            aria-hidden="true"
          />
          <span>{statusMessage}</span>
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
        <Table aria-busy={definitions === null}>
          <TableCaption>Ajustes con alcance de plataforma</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Ajuste</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Valor vigente</TableHead>
              <TableHead scope="col">Origen</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions === null ? (
              <LoadingRows columns={5} />
            ) : definitions.filter((d) => d.allowedScopes.includes("PLATFORM")).length === 0 ? (
              <TableRow>
                <TableEmpty
                  colSpan={5}
                  title="Ningún ajuste admite alcance de plataforma"
                  description="El catálogo actual solo permite overrides de tenant o empresa."
                />
              </TableRow>
            ) : (
              definitions
                .filter((definition) => definition.allowedScopes.includes("PLATFORM"))
                .map((definition) => {
                  const current = settingByKey.get(definition.key);
                  return (
                    <TableRow key={definition.key}>
                      <TableCell>
                        <code className="text-[11px] font-bold">{definition.key}</code>
                        <span className="mt-1 block text-[11px] font-medium leading-5 text-[var(--muted)]">
                          {definition.description}
                        </span>
                      </TableCell>
                      <TableCell>{typeLabel(definition.dataType)}</TableCell>
                      <TableCell>
                        <span className="break-all font-mono text-[11px]">
                          {formatValue(current?.value ?? definition.defaultValue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
                            current?.source === "PLATFORM" ? "text-[var(--accent)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {current?.source === "PLATFORM" ? "Plataforma" : "Predeterminado"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="quiet"
                          className="h-9 px-3"
                          aria-label={`Editar ajuste de plataforma ${definition.key}`}
                          onClick={() => setModalState({ definition, current })}
                        >
                          <PencilSimple size={16} weight="bold" aria-hidden="true" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      )}

      <PlatformSettingModal
        state={modalState}
        onOpenChange={(open) => !open && setModalState(null)}
        onSaved={(saved) => {
          setSettings((current) => [...(current ?? []).filter((s) => s.key !== saved.key), saved]);
          setStatusMessage(`El ajuste ${saved.key} ahora aplica a toda la plataforma.`);
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Platform audit tab
// ---------------------------------------------------------------------------

function AuditPanel({ active }: { active: boolean }) {
  const { getAccessToken } = useAuth();
  const [entries, setEntries] = useState<AuditEntryResponse[] | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setEntries(null);
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setEntries(await apiClient.listPlatformAuditEntries(accessToken, 100, signal));
      } catch (err) {
        if (!isAbortError(err)) setError(getErrorMessage(err));
      }
    },
    [getAccessToken],
  );

  // Actions taken in the Users/Settings tabs land here as new rows, but
  // those panels stay mounted (Tabs only toggles `hidden`) so this effect
  // must re-run on every visit, not just the first mount, or the tab would
  // keep showing whatever was current the first time it was opened.
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active, load]);

  return (
    <section aria-labelledby="platform-audit-title" className="grid gap-4">
      <div>
        <h2 id="platform-audit-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
          Actividad de la plataforma
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          Eventos sin tenant: inicios/cierres de sesión, registros y cambios de estado de cuenta.
        </p>
      </div>

      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={entries === null}>
          <TableCaption>Últimas 100 entradas de actividad de plataforma</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Acción</TableHead>
              <TableHead scope="col">Recurso</TableHead>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Correlación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries === null ? (
              <LoadingRows columns={4} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Sin actividad registrada" />
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <ClockCounterClockwise
                        size={17}
                        weight="duotone"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block font-bold">{actionLabel(entry.action)}</span>
                        <code className="text-[10px] font-medium text-[var(--muted)]">{entry.action}</code>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-[var(--muted-strong)]">
                    {entry.resource}
                    {entry.resourceId ? (
                      <span className="block truncate font-mono text-[10px] text-[var(--muted)]">
                        {entry.resourceId}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-[var(--muted-strong)]">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <code className="text-[10px] text-[var(--muted)]">{entry.correlationId}</code>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PlatformAdminPage({ navigate }: PlatformAdminPageProps) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <ProductShell
      eyebrow="Plano de administración"
      title="Administración de plataforma"
      description="Capacidades cross-tenant reservadas a administradores de plataforma: usuarios, ajustes globales y actividad sin tenant."
      navigate={navigate}
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/tenants")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver a tus espacios
        </Button>
      }
    >
      <div className="pt-7">
        <Tabs
          ariaLabel="Administración de plataforma"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            {
              id: "users",
              label: (
                <span className="flex items-center gap-2">
                  <Users size={16} aria-hidden="true" />
                  Usuarios
                </span>
              ),
              panel: <UsersPanel />,
            },
            {
              id: "settings",
              label: (
                <span className="flex items-center gap-2">
                  <GearSix size={16} aria-hidden="true" />
                  Ajustes
                </span>
              ),
              panel: <PlatformSettingsPanel />,
            },
            {
              id: "audit",
              label: (
                <span className="flex items-center gap-2">
                  <ClockCounterClockwise size={16} aria-hidden="true" />
                  Actividad
                </span>
              ),
              panel: <AuditPanel active={activeTab === "audit"} />,
            },
          ]}
        />
        <aside className="mt-3 flex items-start gap-3 border-t border-[var(--line)] pt-5 text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
          <ShieldCheck
            size={18}
            weight="duotone"
            className="mt-0.5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-extrabold text-[var(--ink)]">Alcance de esta sección</p>
            <p className="mt-1 max-w-[82ch]">
              Todo lo que ves y cambias aquí es cross-tenant: no depende del espacio que tengas
              seleccionado. El primer administrador de plataforma se otorga con una operación
              directa de base de datos, no desde esta pantalla.
            </p>
          </div>
        </aside>
      </div>
    </ProductShell>
  );
}
