import {
  ArrowLeft,
  CheckCircle,
  GearSix,
  PencilSimple,
  Plus,
  SlidersHorizontal,
  UserCircleGear,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  EffectiveSettingResponse,
  SettingDataType,
  SettingDefinitionResponse,
  SettingValueResponse,
  TenantSummary,
  UserPreferenceResponse,
  WritableSettingScope,
} from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
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
import { Tabs } from "../../shared/ui/tabs";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface SettingsPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

type PreferenceValueType = SettingDataType;

interface PreferenceModalState {
  preference?: UserPreferenceResponse;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function serializeValue(value: unknown, dataType?: SettingDataType): string {
  if (dataType === "STRING" || typeof value === "string") {
    return typeof value === "string" ? value : String(value ?? "");
  }
  if (dataType === "JSON" || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value, null, 2);
  }
  return String(value ?? "");
}

function inferValueType(value: unknown): PreferenceValueType {
  if (typeof value === "number") return "NUMBER";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "object" && value !== null) return "JSON";
  return "STRING";
}

function parseValue(
  rawValue: string,
  dataType: SettingDataType,
): { value?: unknown; error?: string } {
  if (dataType === "STRING") {
    return { value: rawValue };
  }
  if (dataType === "NUMBER") {
    const value = Number(rawValue);
    return rawValue.trim() && Number.isFinite(value)
      ? { value }
      : { error: "Ingresa un número válido." };
  }
  if (dataType === "BOOLEAN") {
    return { value: rawValue === "true" };
  }
  try {
    return { value: JSON.parse(rawValue) as unknown };
  } catch {
    return { error: "Ingresa JSON válido." };
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value || "Cadena vacía";
  return JSON.stringify(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceLabel(source: EffectiveSettingResponse["source"]): string {
  return {
    COMPANY: "Empresa",
    TENANT: "Tenant",
    PLATFORM: "Plataforma",
    DEFAULT: "Predeterminado",
  }[source];
}

function typeLabel(dataType: SettingDataType): string {
  return {
    STRING: "Texto",
    NUMBER: "Número",
    BOOLEAN: "Sí / No",
    JSON: "JSON",
  }[dataType];
}

function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 3 }, (_, rowIndex) => (
    <TableRow key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <span className="block h-3.5 max-w-40 animate-pulse rounded bg-[var(--line)]" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

interface ValueEditorProps {
  id: string;
  dataType: SettingDataType;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

function ValueEditor({ id, dataType, value, error, onChange, autoFocus }: ValueEditorProps) {
  if (dataType === "BOOLEAN") {
    return (
      <Select
        id={id}
        name={id}
        label="Valor"
        value={value}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </Select>
    );
  }

  if (dataType === "JSON") {
    return (
      <label className="grid gap-2 text-[13px] font-bold text-[var(--ink)]" htmlFor={id}>
        Valor
        <textarea
          id={id}
          name={id}
          rows={8}
          value={value}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-y rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 py-3 font-mono text-[12px] font-medium leading-5 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        />
        {error ? (
          <span id={`${id}-error`} role="alert" className="text-[12px] text-[var(--danger)]">
            {error}
          </span>
        ) : (
          <span id={`${id}-hint`} className="text-[12px] font-medium text-[var(--muted)]">
            Usa sintaxis JSON válida para objetos, listas o valores nulos.
          </span>
        )}
      </label>
    );
  }

  return (
    <FormField
      id={id}
      name={id}
      label="Valor"
      type={dataType === "NUMBER" ? "number" : "text"}
      step={dataType === "NUMBER" ? "any" : undefined}
      value={value}
      autoFocus={autoFocus}
      error={error}
      hint={dataType === "NUMBER" ? "Se guardará como número, no como texto." : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface SettingModalProps {
  definition: SettingDefinitionResponse | null;
  effective?: EffectiveSettingResponse;
  selection: WorkspaceSelection;
  onOpenChange: (open: boolean) => void;
  onSaved: (value: SettingValueResponse) => void;
}

function SettingModal({
  definition,
  effective,
  selection,
  onOpenChange,
  onSaved,
}: SettingModalProps) {
  const { getAccessToken } = useAuth();
  const writableScopes = useMemo(
    () =>
      definition?.allowedScopes.filter(
        (scope): scope is WritableSettingScope => scope === "TENANT" || scope === "COMPANY",
      ) ?? [],
    [definition],
  );
  const preferredScope =
    selection.companyId && writableScopes.includes("COMPANY") ? "COMPANY" : writableScopes[0];
  const [scopeType, setScopeType] = useState<WritableSettingScope>(preferredScope ?? "TENANT");
  const [companyId, setCompanyId] = useState(selection.companyId ?? "");
  const [rawValue, setRawValue] = useState("");
  const [valueError, setValueError] = useState<string>();
  const [companyError, setCompanyError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!definition) return;
    const nextScope =
      selection.companyId && writableScopes.includes("COMPANY")
        ? "COMPANY"
        : (writableScopes[0] ?? "TENANT");
    setScopeType(nextScope);
    setCompanyId(selection.companyId ?? "");
    setRawValue(serializeValue(effective?.value ?? definition.defaultValue, definition.dataType));
    setValueError(undefined);
    setCompanyError(undefined);
    setRequestError(undefined);
    setBusy(false);
  }, [definition, effective?.value, selection.companyId, writableScopes]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!definition) return;
    const normalizedCompanyId = companyId.trim();
    const nextCompanyError =
      scopeType === "COMPANY" && !normalizedCompanyId ? "Ingresa el ID de la empresa." : undefined;
    const parsed = parseValue(rawValue, definition.dataType);
    setCompanyError(nextCompanyError);
    setValueError(parsed.error);
    setRequestError(undefined);
    if (nextCompanyError || parsed.error) return;

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const saved = await apiClient.setSettingValue(accessToken, selection.slug, definition.key, {
        scopeType,
        ...(scopeType === "COMPANY" ? { companyId: normalizedCompanyId } : {}),
        value: parsed.value,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(definition)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={definition ? `Editar ${definition.key}` : "Editar ajuste"}
      description="Guarda un override para el tenant o para una empresa. Los valores de plataforma son de solo lectura."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="setting-value-form" busy={busy}>
            Guardar ajuste
          </Button>
        </>
      }
    >
      <form id="setting-value-form" className="grid gap-5" onSubmit={(event) => void submit(event)}>
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <Select
          name="settingScope"
          label="Alcance"
          value={scopeType}
          hint="Empresa prevalece sobre tenant durante la resolución efectiva."
          onChange={(event) => {
            setScopeType(event.target.value as WritableSettingScope);
            setCompanyError(undefined);
          }}
        >
          {writableScopes.includes("TENANT") ? <option value="TENANT">Tenant</option> : null}
          {writableScopes.includes("COMPANY") ? <option value="COMPANY">Empresa</option> : null}
        </Select>
        {scopeType === "COMPANY" ? (
          <FormField
            name="companyId"
            label="ID de empresa"
            value={companyId}
            error={companyError}
            hint="Debe pertenecer al tenant activo."
            onChange={(event) => {
              setCompanyId(event.target.value);
              setCompanyError(undefined);
            }}
          />
        ) : null}
        <ValueEditor
          id="setting-modal-value"
          dataType={definition?.dataType ?? "STRING"}
          value={rawValue}
          error={valueError}
          autoFocus={scopeType !== "COMPANY"}
          onChange={(value) => {
            setRawValue(value);
            setValueError(undefined);
          }}
        />
      </form>
    </Modal>
  );
}

interface PreferenceModalProps {
  state: PreferenceModalState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (preference: UserPreferenceResponse) => void;
}

function PreferenceModal({ state, onOpenChange, onSaved }: PreferenceModalProps) {
  const { getAccessToken } = useAuth();
  const editing = state?.preference;
  const [key, setKey] = useState("");
  const [dataType, setDataType] = useState<PreferenceValueType>("STRING");
  const [rawValue, setRawValue] = useState("");
  const [keyError, setKeyError] = useState<string>();
  const [valueError, setValueError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    const nextType = editing ? inferValueType(editing.value) : "STRING";
    setKey(editing?.key ?? "");
    setDataType(nextType);
    setRawValue(editing ? serializeValue(editing.value, nextType) : "");
    setKeyError(undefined);
    setValueError(undefined);
    setRequestError(undefined);
    setBusy(false);
  }, [editing, state]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedKey = key.trim();
    const nextKeyError = normalizedKey ? undefined : "Ingresa una clave para la preferencia.";
    const parsed = parseValue(rawValue, dataType);
    setKeyError(nextKeyError);
    setValueError(parsed.error);
    setRequestError(undefined);
    if (nextKeyError || parsed.error) return;

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const saved = await apiClient.setUserPreference(accessToken, normalizedKey, parsed.value);
      onSaved(saved);
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
      title={editing ? `Editar ${editing.key}` : "Nueva preferencia"}
      description="Las preferencias pertenecen a tu usuario y no requieren contexto de tenant."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="preference-form" busy={busy}>
            Guardar preferencia
          </Button>
        </>
      }
    >
      <form id="preference-form" className="grid gap-5" onSubmit={(event) => void submit(event)}>
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <FormField
          name="preferenceKey"
          label="Clave"
          value={key}
          disabled={Boolean(editing)}
          autoFocus={!editing}
          error={keyError}
          hint="La API acepta claves libres. Usa un nombre estable y descriptivo."
          onChange={(event) => {
            setKey(event.target.value);
            setKeyError(undefined);
          }}
        />
        <Select
          name="preferenceType"
          label="Tipo de valor"
          value={dataType}
          onChange={(event) => {
            const nextType = event.target.value as PreferenceValueType;
            setDataType(nextType);
            setRawValue(nextType === "BOOLEAN" ? "true" : "");
            setValueError(undefined);
          }}
        >
          <option value="STRING">Texto</option>
          <option value="NUMBER">Número</option>
          <option value="BOOLEAN">Sí / No</option>
          <option value="JSON">JSON</option>
        </Select>
        <ValueEditor
          id="preference-modal-value"
          dataType={dataType}
          value={rawValue}
          error={valueError}
          onChange={(value) => {
            setRawValue(value);
            setValueError(undefined);
          }}
        />
      </form>
    </Modal>
  );
}

export function SettingsPage({ selection, navigate }: SettingsPageProps) {
  const { getAccessToken } = useAuth();
  const [definitions, setDefinitions] = useState<SettingDefinitionResponse[] | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSettingResponse[] | null>(
    null,
  );
  const [preferences, setPreferences] = useState<UserPreferenceResponse[] | null>(null);
  const [definitionsError, setDefinitionsError] = useState<string>();
  const [effectiveError, setEffectiveError] = useState<string>();
  const [preferencesError, setPreferencesError] = useState<string>();
  const [selectedDefinition, setSelectedDefinition] = useState<SettingDefinitionResponse | null>(
    null,
  );
  const [preferenceModal, setPreferenceModal] = useState<PreferenceModalState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>();

  const loadSettings = useCallback(
    async (signal?: AbortSignal) => {
      setDefinitions(null);
      setEffectiveSettings(null);
      setDefinitionsError(undefined);
      setEffectiveError(undefined);
      let accessToken: string;
      try {
        accessToken = await getAccessToken();
      } catch (error) {
        if (!isAbortError(error)) {
          const message = getErrorMessage(error);
          setDefinitionsError(message);
          setEffectiveError(message);
        }
        return;
      }

      const [definitionsResult, effectiveResult] = await Promise.allSettled([
        apiClient.listSettingDefinitions(accessToken, selection.slug, signal),
        apiClient.listEffectiveSettings(accessToken, selection.slug, selection.companyId, signal),
      ]);
      if (definitionsResult.status === "fulfilled") {
        setDefinitions(definitionsResult.value);
      } else if (!isAbortError(definitionsResult.reason)) {
        setDefinitionsError(getErrorMessage(definitionsResult.reason));
      }
      if (effectiveResult.status === "fulfilled") {
        setEffectiveSettings(effectiveResult.value);
      } else if (!isAbortError(effectiveResult.reason)) {
        setEffectiveError(getErrorMessage(effectiveResult.reason));
      }
    },
    [getAccessToken, selection.companyId, selection.slug],
  );

  const loadPreferences = useCallback(
    async (signal?: AbortSignal) => {
      setPreferences(null);
      setPreferencesError(undefined);
      try {
        const accessToken = await getAccessToken();
        const result = await apiClient.listUserPreferences(accessToken, signal);
        setPreferences([...result].sort((left, right) => left.key.localeCompare(right.key)));
      } catch (error) {
        if (!isAbortError(error)) setPreferencesError(getErrorMessage(error));
      }
    },
    [getAccessToken],
  );

  const reloadEffective = useCallback(async () => {
    setEffectiveError(undefined);
    try {
      const accessToken = await getAccessToken();
      setEffectiveSettings(
        await apiClient.listEffectiveSettings(accessToken, selection.slug, selection.companyId),
      );
    } catch (error) {
      setEffectiveError(getErrorMessage(error));
    }
  }, [getAccessToken, selection.companyId, selection.slug]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSettings(controller.signal);
    void loadPreferences(controller.signal);
    return () => controller.abort();
  }, [loadPreferences, loadSettings]);

  const definitionByKey = useMemo(
    () => new Map((definitions ?? []).map((definition) => [definition.key, definition])),
    [definitions],
  );
  const effectiveByKey = useMemo(
    () => new Map((effectiveSettings ?? []).map((setting) => [setting.key, setting])),
    [effectiveSettings],
  );

  const effectivePanel = (
    <section aria-labelledby="effective-settings-title" className="grid gap-4">
      <div>
        <h2
          id="effective-settings-title"
          className="text-[17px] font-extrabold tracking-[-0.025em]"
        >
          Valores efectivos
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          Resolución actual para{" "}
          {selection.companyId ? "la empresa seleccionada" : "el tenant activo"}.
        </p>
      </div>
      {effectiveError ? (
        <div className="grid gap-3">
          <ErrorNotice message={effectiveError} />
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => void loadSettings()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={effectiveSettings === null}>
          <TableCaption>Valores efectivos de configuración</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Ajuste</TableHead>
              <TableHead scope="col">Valor</TableHead>
              <TableHead scope="col">Origen</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effectiveSettings === null ? (
              <LoadingRows columns={4} />
            ) : effectiveSettings.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="No hay ajustes disponibles" />
              </TableRow>
            ) : (
              effectiveSettings.map((setting) => {
                const definition = definitionByKey.get(setting.key);
                return (
                  <TableRow key={setting.key}>
                    <TableCell>
                      <code className="text-[11px] font-bold">{setting.key}</code>
                      {definition ? (
                        <span className="mt-1 block text-[11px] font-medium text-[var(--muted)]">
                          {definition.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="break-all font-mono text-[11px]">
                        {formatValue(setting.value)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${setting.source === "DEFAULT" ? "text-[var(--muted)]" : "text-[var(--accent)]"}`}
                      >
                        {sourceLabel(setting.source)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        disabled={!definition}
                        aria-label={`Editar ajuste ${setting.key}`}
                        onClick={() => definition && setSelectedDefinition(definition)}
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
    </section>
  );

  const catalogPanel = (
    <section aria-labelledby="settings-catalog-title" className="grid gap-4">
      <div>
        <h2 id="settings-catalog-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
          Catálogo de ajustes
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          Definiciones globales de solo lectura publicadas por la plataforma.
        </p>
      </div>
      {definitionsError ? (
        <ErrorNotice message={definitionsError} />
      ) : (
        <Table aria-busy={definitions === null}>
          <TableCaption>Catálogo global de ajustes</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Clave</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Predeterminado</TableHead>
              <TableHead scope="col">Alcances</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions === null ? (
              <LoadingRows columns={4} />
            ) : definitions.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="El catálogo está vacío" />
              </TableRow>
            ) : (
              definitions.map((definition) => (
                <TableRow key={definition.key}>
                  <TableCell>
                    <code className="text-[11px] font-bold">{definition.key}</code>
                    <span className="mt-1 block text-[11px] font-medium leading-5 text-[var(--muted)]">
                      {definition.description}
                    </span>
                  </TableCell>
                  <TableCell>{typeLabel(definition.dataType)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px]">
                      {formatValue(definition.defaultValue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[10px] text-[var(--muted-strong)]">
                      {definition.allowedScopes.join(" / ")}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );

  const preferencesPanel = (
    <section aria-labelledby="preferences-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="preferences-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
            Preferencias personales
          </h2>
          <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
            Valores libres asociados únicamente a tu usuario.
          </p>
        </div>
        <Button type="button" onClick={() => setPreferenceModal({})}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva preferencia
        </Button>
      </div>
      {preferencesError ? (
        <div className="grid gap-3">
          <ErrorNotice message={preferencesError} />
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => void loadPreferences()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={preferences === null}>
          <TableCaption>Preferencias del usuario autenticado</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Clave</TableHead>
              <TableHead scope="col">Valor</TableHead>
              <TableHead scope="col">Actualización</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preferences === null ? (
              <LoadingRows columns={4} />
            ) : preferences.length === 0 ? (
              <TableRow>
                <TableEmpty
                  colSpan={4}
                  title="Aún no tienes preferencias"
                  description="Crea una preferencia personal usando una clave libre y un valor tipado."
                />
              </TableRow>
            ) : (
              preferences.map((preference) => (
                <TableRow key={preference.key}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <UserCircleGear
                        size={17}
                        weight="duotone"
                        className="text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <code className="text-[11px] font-bold">{preference.key}</code>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="break-all font-mono text-[11px]">
                      {formatValue(preference.value)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-[var(--muted-strong)]">
                    {formatDate(preference.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="quiet"
                      className="h-9 px-3"
                      aria-label={`Editar preferencia ${preference.key}`}
                      onClick={() => setPreferenceModal({ preference })}
                    >
                      <PencilSimple size={16} weight="bold" aria-hidden="true" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Ajustes"
      description="Consulta la configuración efectiva, administra overrides permitidos y conserva tus preferencias personales."
      action={
        <Button type="button" variant="secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver al workspace
        </Button>
      }
    >
      <div className="pt-7">
        {statusMessage ? (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-3 text-[13px] font-semibold text-[var(--ink)]"
          >
            <CheckCircle
              size={18}
              weight="fill"
              className="shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <span>{statusMessage}</span>
          </div>
        ) : null}
        <Tabs
          ariaLabel="Administración de ajustes"
          items={[
            {
              id: "effective",
              label: (
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Valores efectivos
                </span>
              ),
              panel: effectivePanel,
            },
            {
              id: "catalog",
              label: (
                <span className="flex items-center gap-2">
                  <GearSix size={16} aria-hidden="true" />
                  Catálogo
                </span>
              ),
              panel: catalogPanel,
            },
            {
              id: "preferences",
              label: (
                <span className="flex items-center gap-2">
                  <UserCircleGear size={16} aria-hidden="true" />
                  Preferencias
                </span>
              ),
              panel: preferencesPanel,
            },
          ]}
        />
        <aside className="mt-3 border-t border-[var(--line)] pt-5 text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
          <p className="font-extrabold text-[var(--ink)]">Jerarquía y seguridad</p>
          <p className="mt-1 max-w-[82ch]">
            Empresa prevalece sobre tenant, luego plataforma y finalmente el valor predeterminado.
            Esta UI solo permite escribir en tenant o empresa; el alcance de plataforma permanece
            protegido.
          </p>
        </aside>
      </div>

      <SettingModal
        definition={selectedDefinition}
        effective={selectedDefinition ? effectiveByKey.get(selectedDefinition.key) : undefined}
        selection={selection}
        onOpenChange={(open) => !open && setSelectedDefinition(null)}
        onSaved={(value) => {
          setStatusMessage(`El ajuste ${value.key} fue guardado para ${value.scopeType}.`);
          void reloadEffective();
        }}
      />
      <PreferenceModal
        state={preferenceModal}
        onOpenChange={(open) => !open && setPreferenceModal(null)}
        onSaved={(saved) => {
          setPreferences((current) =>
            [...(current ?? []).filter((item) => item.key !== saved.key), saved].sort(
              (left, right) => left.key.localeCompare(right.key),
            ),
          );
          setStatusMessage(`La preferencia ${saved.key} fue guardada.`);
        }}
      />
    </ProductShell>
  );
}
