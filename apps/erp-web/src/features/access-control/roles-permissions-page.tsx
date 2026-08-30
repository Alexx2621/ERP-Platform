import {
  ArrowLeft,
  CheckCircle,
  EnvelopeSimple,
  Key,
  LockKey,
  Plus,
  Prohibit,
  ShieldCheck,
  UserPlus,
  Users,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  MembershipWithUserResponse,
  PermissionResponse,
  RoleAssignmentResponse,
  RoleAssignmentScope,
  RoleResponse,
  TenantSummary,
} from "@erp/api-client";
import { ProductShell } from "../workspace/product-shell";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { formatDateTime } from "../../shared/format/date";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
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
  members: MembershipWithUserResponse[];
  onOpenChange: (open: boolean) => void;
  onAssigned: (assignment: RoleAssignmentResponse) => void;
}

interface InviteMemberModalProps {
  open: boolean;
  tenantSlug: string;
  onOpenChange: (open: boolean) => void;
  onInvited: (membership: MembershipWithUserResponse) => void;
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

function AssignRoleModal({ role, selection, members, onOpenChange, onAssigned }: AssignRoleModalProps) {
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
      setMembershipId(members[0]?.id ?? selection.membershipId);
      setScopeType("TENANT");
      setScopeId(selection.companyId ?? "");
      setMembershipError(undefined);
      setScopeError(undefined);
      setRequestError(undefined);
      setBusy(false);
    }
  }, [role, members, selection.companyId, selection.membershipId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      return;
    }

    const normalizedMembershipId = membershipId.trim();
    const normalizedScopeId = scopeId.trim();
    const nextMembershipError = normalizedMembershipId
      ? undefined
      : "Selecciona una membresía.";
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
        {members.length > 0 ? (
          <Select
            name="membershipId"
            label="Miembro"
            value={membershipId}
            error={membershipError}
            hint="Miembros del tenant activo, con su correo y estado."
            onChange={(event) => {
              setMembershipId(event.target.value);
              setMembershipError(undefined);
            }}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName} · {member.email} · {member.status}
              </option>
            ))}
          </Select>
        ) : (
          <FormField
            name="membershipId"
            label="ID de membresía"
            value={membershipId}
            autoComplete="off"
            error={membershipError}
            hint="No fue posible cargar el listado de miembros; ingresa el ID manualmente."
            onChange={(event) => {
              setMembershipId(event.target.value);
              setMembershipError(undefined);
            }}
          />
        )}
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

function InviteMemberModal({ open, tenantSlug, onOpenChange, onInvited }: InviteMemberModalProps) {
  const { getAccessToken } = useAuth();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setEmailError(undefined);
      setRequestError(undefined);
      setBusy(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const nextEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ? undefined
      : "Ingresa un correo válido.";

    setEmailError(nextEmailError);
    setRequestError(undefined);
    if (nextEmailError) {
      return;
    }

    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const membership = await apiClient.inviteMembership(accessToken, tenantSlug, {
        email: normalizedEmail,
      });
      onInvited(membership);
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
      title="Invitar miembro"
      description="La persona debe tener ya una cuenta en la plataforma. Quedará como invitación hasta que la acepte."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="invite-member-form" busy={busy}>
            Enviar invitación
          </Button>
        </>
      }
    >
      <form
        id="invite-member-form"
        className="grid gap-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {requestError ? <ErrorNotice message={requestError} /> : null}
        <FormField
          name="email"
          type="email"
          label="Correo electrónico"
          value={email}
          autoComplete="off"
          autoFocus
          error={emailError}
          hint="Debe corresponder a una cuenta ya registrada en la plataforma."
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(undefined);
          }}
        />
      </form>
    </Modal>
  );
}

interface RevokeInvitationModalProps {
  member: MembershipWithUserResponse | null;
  tenantSlug: string;
  onOpenChange: (open: boolean) => void;
  onRevoked: (membershipId: string) => void;
}

function RevokeInvitationModal({ member, tenantSlug, onOpenChange, onRevoked }: RevokeInvitationModalProps) {
  const { getAccessToken } = useAuth();
  const [requestError, setRequestError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setRequestError(undefined);
    setBusy(false);
  }, [member]);

  if (!member) return null;

  const handleRevoke = async () => {
    setBusy(true);
    setRequestError(undefined);
    try {
      const accessToken = await getAccessToken();
      await apiClient.revokeMembershipInvitation(accessToken, tenantSlug, member.id);
      onRevoked(member.id);
      onOpenChange(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(member)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title={`Revocar invitación de ${member.displayName}`}
      description="La invitación quedará cancelada. Puedes invitar de nuevo a esta persona más adelante si lo necesitas."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" busy={busy} onClick={() => void handleRevoke()}>
            Revocar invitación
          </Button>
        </>
      }
    >
      {requestError ? <ErrorNotice message={requestError} /> : null}
      <p className="text-[13px] font-medium leading-6 text-[var(--muted-strong)]">{member.email}</p>
    </Modal>
  );
}

export function RolesPermissionsPage({ selection, navigate }: RolesPermissionsPageProps) {
  const { getAccessToken } = useAuth();
  const [roles, setRoles] = useState<RoleResponse[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionResponse[] | null>(null);
  const [members, setMembers] = useState<MembershipWithUserResponse[] | null>(null);
  const [rolesError, setRolesError] = useState<string>();
  const [permissionsError, setPermissionsError] = useState<string>();
  const [membersError, setMembersError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignmentRole, setAssignmentRole] = useState<RoleResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<MembershipWithUserResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>();

  const loadCatalogs = useCallback(
    async (signal?: AbortSignal) => {
      setRoles(null);
      setPermissions(null);
      setMembers(null);
      setRolesError(undefined);
      setPermissionsError(undefined);
      setMembersError(undefined);

      let accessToken: string;
      try {
        accessToken = await getAccessToken();
      } catch (error) {
        if (!isAbortError(error)) {
          const message = getErrorMessage(error);
          setRolesError(message);
          setPermissionsError(message);
          setMembersError(message);
        }
        return;
      }

      const [rolesResult, permissionsResult, membersResult] = await Promise.allSettled([
        apiClient.listRoles(accessToken, selection.slug, signal),
        apiClient.listPermissions(accessToken, selection.slug, signal),
        apiClient.listMemberships(accessToken, selection.slug, signal),
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

      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value);
      } else if (!isAbortError(membersResult.reason)) {
        setMembersError(getErrorMessage(membersResult.reason));
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

  const membersPanel = (
    <section aria-labelledby="members-section-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="members-section-title" className="text-[17px] font-extrabold tracking-[-0.025em]">
            Miembros
          </h2>
          <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">
            Personas con una membresía en {selection.name}, incluidas invitaciones pendientes.
          </p>
        </div>
        <Button type="button" onClick={() => setInviteOpen(true)}>
          <EnvelopeSimple size={17} weight="bold" aria-hidden="true" />
          Invitar miembro
        </Button>
      </div>

      {membersError ? (
        <div className="grid gap-3">
          <ErrorNotice message={membersError} />
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
        <Table aria-busy={members === null}>
          <TableCaption>Miembros del tenant activo</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Correo</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members === null ? (
              <LoadingRows columns={4} />
            ) : members.length === 0 ? (
              <TableRow>
                <TableEmpty
                  colSpan={4}
                  title="No hay miembros"
                  description="Invita a la primera persona para que se una a este tenant."
                />
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Users
                        size={18}
                        weight="duotone"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>{member.displayName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-[var(--muted-strong)]">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                      {member.status}
                    </span>
                    {member.status === "INVITED" && member.expiresAt ? (
                      <span className="mt-1 block text-[11px] font-medium text-[var(--muted)]">
                        Expira el {formatDateTime(member.expiresAt)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.status === "INVITED" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        aria-label={`Revocar invitación de ${member.displayName}`}
                        onClick={() => setRevokeTarget(member)}
                      >
                        <Prohibit size={16} weight="bold" aria-hidden="true" />
                        Revocar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <RevokeInvitationModal
        member={revokeTarget}
        tenantSlug={selection.slug}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        onRevoked={(membershipId) => {
          setMembers((current) =>
            (current ?? []).map((m) => (m.id === membershipId ? { ...m, status: "REVOKED" as const } : m)),
          );
          setStatusMessage("La invitación fue revocada.");
        }}
      />
    </section>
  );

  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title="Roles y permisos"
      description="Administra roles del tenant, consulta el catálogo de permisos y asigna acceso a membresías existentes."
      navigate={navigate}
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
            { id: "members", label: "Miembros", panel: membersPanel },
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
            <p className="font-extrabold text-[var(--ink)]">Invitaciones</p>
            <p className="mt-1 max-w-[76ch]">
              Invitar requiere que la persona ya tenga una cuenta en la plataforma — no se crean
              cuentas por correo. La invitación queda pendiente hasta que la persona la acepte
              desde su propia sesión.
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
        members={members ?? []}
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
      <InviteMemberModal
        open={inviteOpen}
        tenantSlug={selection.slug}
        onOpenChange={setInviteOpen}
        onInvited={(membership) => {
          // Inviting someone whose earlier invitation was REVOKED or expired
          // reopens that exact same row (docs/WORK_QUEUE.md) instead of
          // creating a new one — replace it in place rather than appending,
          // or the member would show up twice.
          setMembers((current) => {
            const existing = current ?? [];
            const alreadyListed = existing.some((m) => m.id === membership.id);
            return alreadyListed
              ? existing.map((m) => (m.id === membership.id ? membership : m))
              : [...existing, membership];
          });
          setStatusMessage(`Se invitó a ${membership.email}. Queda pendiente de aceptación.`);
        }}
      />
    </ProductShell>
  );
}
