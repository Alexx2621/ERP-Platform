import {
  ArrowLeft,
  CheckCircle,
  Key,
  LockKey,
  Plus,
  ShieldCheck,
  UserPlus,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  PermissionResponse,
  RoleAssignmentResponse,
  RoleAssignmentScope,
  RoleResponse,
  TenantSummary,
} from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { WorkspaceNavigation } from "../workspace/workspace-navigation";
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

interface RolesPermissionsPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

interface CreateRoleModalProps {
  open: boolean;
  permissions: PermissionResponse[];
  onOpenChange: (open: boolean) => void;
  onCreated: (role: RoleResponse) => void;
  tenantSlug: string;
}

interface AssignRoleModalProps {
  role: RoleResponse | null;
  selection: WorkspaceSelection;
  onOpenChange: (open: boolean) => void;
  onAssigned: (assignment: RoleAssignmentResponse) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function compareRoles(left: RoleResponse, right: RoleResponse): number {
  if (left.isSystem !== right.isSystem) {
    return left.isSystem ? -1 : 1;
  }
  return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
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

function CreateRoleModal({
  open,
  permissions,
  onOpenChange,
  onCreated,
  tenantSlug,
}: CreateRoleModalProps) {
  const { getAccessToken } = useAuth();
  const [name, setName] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string>();
  const [permissionsError, setPermissionsError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setPermissionKeys([]);
      setNameError(undefined);
      setPermissionsError(undefined);
      setRequestError(undefined);
      setBusy(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const nextNameError = normalizedName
      ? normalizedName.length > 100
        ? "El nombre no puede superar 100 caracteres."
        : undefined
      : "Ingresa un nombre para el rol.";
    const nextPermissionsError =
      permissionKeys.length > 0 ? undefined : "Selecciona al menos un permiso.";

    setNameError(nextNameError);
    setPermissionsError(nextPermissionsError);
    setRequestError(undefined);
    if (nextNameError || nextPermissionsError) {
      return;
    }

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const role = await apiClient.createRole(accessToken, tenantSlug, {
        name: normalizedName,
        permissionKeys,
      });
      onCreated(role);
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          onOpenChange(nextOpen);
        }
      }}
      title="Crear rol"
      description="Define un rol del tenant con uno o más permisos del catálogo vigente."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="create-role-form" busy={busy}>
            Crear rol
          </Button>
        </>
      }
    >
      <form
        id="create-role-form"
        className="grid gap-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <FormField
          name="roleName"
          label="Nombre del rol"
          value={name}
          maxLength={100}
          autoComplete="off"
          autoFocus
          error={nameError}
          hint="Usa un nombre reconocible dentro de este tenant."
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
        />
        <fieldset
          className="grid gap-3"
          aria-describedby={permissionsError ? "role-permissions-error" : undefined}
        >
          <legend className="text-[13px] font-bold text-[var(--ink)]">Permisos</legend>
          <div className="grid gap-2">
            {permissions.map((permission) => {
              const checked = permissionKeys.includes(permission.key);
              return (
                <label
                  key={permission.key}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-3 transition-colors hover:bg-[var(--field-hover)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                    checked={checked}
                    onChange={() => {
                      setPermissionKeys((current) =>
                        checked
                          ? current.filter((key) => key !== permission.key)
                          : [...current, permission.key],
                      );
                      setPermissionsError(undefined);
                    }}
                  />
                  <span>
                    <span className="block font-mono text-[11px] font-bold text-[var(--ink)]">
                      {permission.key}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
                      {permission.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {permissionsError ? (
            <span
              id="role-permissions-error"
              role="alert"
              className="text-[12px] font-semibold text-[var(--danger)]"
            >
              {permissionsError}
            </span>
          ) : null}
        </fieldset>
      </form>
    </Modal>
  );
}

function AssignRoleModal({ role, selection, onOpenChange, onAssigned }: AssignRoleModalProps) {
  const { getAccessToken } = useAuth();
  const [membershipId, setMembershipId] = useState(selection.membershipId);
  const [scopeType, setScopeType] = useState<RoleAssignmentScope>("TENANT");
  const [scopeId, setScopeId] = useState(selection.companyId ?? "");
  const [membershipError, setMembershipError] = useState<string>();
  const [scopeError, setScopeError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role) {
      setMembershipId(selection.membershipId);
      setScopeType("TENANT");
      setScopeId(selection.companyId ?? "");
      setMembershipError(undefined);
      setScopeError(undefined);
      setRequestError(undefined);
      setBusy(false);
    }
  }, [role, selection.companyId, selection.membershipId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      return;
    }

    const normalizedMembershipId = membershipId.trim();
    const normalizedScopeId = scopeId.trim();
    const nextMembershipError = normalizedMembershipId
      ? undefined
      : "Ingresa el ID de una membresía existente.";
    const nextScopeError =
      scopeType === "COMPANY" && !normalizedScopeId
        ? "Ingresa el ID de la empresa para este alcance."
        : undefined;

    setMembershipError(nextMembershipError);
    setScopeError(nextScopeError);
    setRequestError(undefined);
    if (nextMembershipError || nextScopeError) {
      return;
    }

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const assignment = await apiClient.assignRole(accessToken, selection.slug, role.id, {
        membershipId: normalizedMembershipId,
        scopeType,
        ...(scopeType === "COMPANY" ? { scopeId: normalizedScopeId } : {}),
      });
      onAssigned(assignment);
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(role)}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          onOpenChange(nextOpen);
        }
      }}
      title={role ? `Asignar ${role.name}` : "Asignar rol"}
      description="La membresía debe existir previamente dentro del tenant activo."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="assign-role-form" busy={busy}>
            Asignar rol
          </Button>
        </>
      }
    >
      <form
        id="assign-role-form"
        className="grid gap-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <FormField
          name="membershipId"
          label="ID de membresía"
          value={membershipId}
          autoComplete="off"
          error={membershipError}
          hint="Se usa tu membresía actual como valor inicial. Puedes reemplazarla por otro ID conocido."
          onChange={(event) => {
            setMembershipId(event.target.value);
            setMembershipError(undefined);
          }}
        />
        <Select
          name="scopeType"
          label="Alcance"
          value={scopeType}
          hint="Tenant aplica en todo el espacio. Empresa limita la asignación a una empresa."
          onChange={(event) => {
            setScopeType(event.target.value as RoleAssignmentScope);
            setScopeError(undefined);
          }}
        >
          <option value="TENANT">Tenant</option>
          <option value="COMPANY">Empresa</option>
        </Select>
        {scopeType === "COMPANY" ? (
          <FormField
            name="scopeId"
            label="ID de empresa"
            value={scopeId}
            autoComplete="off"
            error={scopeError}
            hint="Este campo corresponde a scopeId en el contrato HTTP."
            onChange={(event) => {
              setScopeId(event.target.value);
              setScopeError(undefined);
            }}
          />
        ) : null}
      </form>
    </Modal>
  );
}

export function RolesPermissionsPage({ selection, navigate }: RolesPermissionsPageProps) {
  const { getAccessToken } = useAuth();
  const [roles, setRoles] = useState<RoleResponse[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionResponse[] | null>(null);
  const [rolesError, setRolesError] = useState<string>();
  const [permissionsError, setPermissionsError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentRole, setAssignmentRole] = useState<RoleResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>();

  const loadCatalogs = useCallback(
    async (signal?: AbortSignal) => {
      setRoles(null);
      setPermissions(null);
      setRolesError(undefined);
      setPermissionsError(undefined);

      let accessToken: string;
      try {
        accessToken = await getAccessToken();
      } catch (error) {
        if (!isAbortError(error)) {
          const message = getErrorMessage(error);
          setRolesError(message);
          setPermissionsError(message);
        }
        return;
      }

      const [rolesResult, permissionsResult] = await Promise.allSettled([
        apiClient.listRoles(accessToken, selection.slug, signal),
        apiClient.listPermissions(accessToken, selection.slug, signal),
      ]);

      if (rolesResult.status === "fulfilled") {
        setRoles([...rolesResult.value].sort(compareRoles));
      } else if (!isAbortError(rolesResult.reason)) {
        setRolesError(getErrorMessage(rolesResult.reason));
      }

      if (permissionsResult.status === "fulfilled") {
        setPermissions(permissionsResult.value);
      } else if (!isAbortError(permissionsResult.reason)) {
        setPermissionsError(getErrorMessage(permissionsResult.reason));
      }
    },
    [getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalogs(controller.signal);
    return () => controller.abort();
  }, [loadCatalogs]);

  const rolesPanel = (
    <section aria-labelledby="roles-section-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="roles-section-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
            Roles del tenant
          </h2>
          <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
            Cada rol agrupa permisos aplicables dentro de {selection.name}.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!permissions || Boolean(permissionsError)}
          title={permissionsError ? "El catálogo de permisos no está disponible." : undefined}
        >
          <Plus size={17} weight="bold" aria-hidden="true" />
          Crear rol
        </Button>
      </div>

      {rolesError ? (
        <div className="grid gap-3">
          <ErrorNotice message={rolesError} />
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => void loadCatalogs()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={roles === null}>
          <TableCaption>Roles del tenant activo</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Rol</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Permisos</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles === null ? (
              <LoadingRows columns={4} />
            ) : roles.length === 0 ? (
              <TableRow>
                <TableEmpty
                  colSpan={4}
                  title="No hay roles"
                  description="Crea el primer rol para organizar los permisos del tenant."
                />
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck
                        size={18}
                        weight="duotone"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>{role.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                      {role.isSystem ? "Sistema" : "Personalizado"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[520px] flex-wrap gap-x-3 gap-y-1">
                      {role.permissionKeys.map((key) => (
                        <code
                          key={key}
                          className="text-[10px] font-semibold text-[var(--muted-strong)]"
                        >
                          {key}
                        </code>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="quiet"
                      className="h-9 px-3"
                      aria-label={`Asignar rol ${role.name}`}
                      onClick={() => setAssignmentRole(role)}
                    >
                      <UserPlus size={16} weight="bold" aria-hidden="true" />
                      Asignar
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

  const permissionsPanel = (
    <section aria-labelledby="permissions-section-title" className="grid gap-4">
      <div>
        <h2
          id="permissions-section-title"
          className="text-[17px] font-extrabold tracking-[-0.025em]"
        >
          Catálogo de permisos
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
          El catálogo es global y de solo lectura. La plataforma define sus claves.
        </p>
      </div>

      {permissionsError ? (
        <div className="grid gap-3">
          <ErrorNotice message={permissionsError} />
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => void loadCatalogs()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={permissions === null}>
          <TableCaption>Catálogo global de permisos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Clave</TableHead>
              <TableHead scope="col">Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions === null ? (
              <LoadingRows columns={2} />
            ) : permissions.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={2} title="No hay permisos disponibles" />
              </TableRow>
            ) : (
              permissions.map((permission) => (
                <TableRow key={permission.key}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Key
                        size={17}
                        weight="duotone"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <code className="text-[11px] font-bold">{permission.key}</code>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium leading-5 text-[var(--muted-strong)]">
                    {permission.description}
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
      title="Roles y permisos"
      description="Administra roles del tenant, consulta el catálogo de permisos y asigna acceso a membresías existentes."
      navigation={<WorkspaceNavigation activePath="/roles" navigate={navigate} />}
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
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-3 text-[13px] font-semibold leading-5 text-[var(--ink)]"
          >
            <CheckCircle
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        <Tabs
          ariaLabel="Administración de roles y permisos"
          items={[
            { id: "roles", label: "Roles", panel: rolesPanel },
            { id: "permissions", label: "Permisos", panel: permissionsPanel },
          ]}
        />

        <aside className="mt-3 flex items-start gap-3 border-t border-[var(--line)] pt-5 text-[12px] font-medium leading-5 text-[var(--muted-strong)]">
          <LockKey
            size={18}
            weight="duotone"
            className="mt-0.5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-extrabold text-[var(--ink)]">Membresías existentes</p>
            <p className="mt-1 max-w-[76ch]">
              La API todavía no ofrece invitaciones, listado de miembros ni consulta de
              asignaciones. Esta pantalla solo envía una asignación cuando proporcionas un ID de
              membresía ya existente.
            </p>
          </div>
        </aside>
      </div>

      <CreateRoleModal
        open={createOpen}
        permissions={permissions ?? []}
        tenantSlug={selection.slug}
        onOpenChange={setCreateOpen}
        onCreated={(role) => {
          setRoles((current) => [...(current ?? []), role].sort(compareRoles));
          setStatusMessage(`El rol ${role.name} fue creado.`);
        }}
      />
      <AssignRoleModal
        role={assignmentRole}
        selection={selection}
        onOpenChange={(open) => {
          if (!open) {
            setAssignmentRole(null);
          }
        }}
        onAssigned={(assignment) => {
          setStatusMessage(
            `El rol fue asignado a la membresía ${assignment.membershipId} con alcance ${assignment.scopeType}.`,
          );
        }}
      />
    </ProductShell>
  );
}
